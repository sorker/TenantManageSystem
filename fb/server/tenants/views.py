from django.shortcuts import render
from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django_filters import rest_framework as filters
from .models import Tenant, TenantContractImage
from .serializers import TenantSerializer, TenantContractImageSerializer
from payments.serializers import PaymentHistorySerializer
import logging

logger = logging.getLogger(__name__)

# Create your views here.

class TenantListCreateView(generics.ListCreateAPIView):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer

class TenantRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer

class TenantFilter(filters.FilterSet):
    is_active = filters.BooleanFilter(field_name='is_active')
    location = filters.CharFilter(field_name='room__location__name')
    room_number = filters.CharFilter(field_name='room__room_number')
    room = filters.NumberFilter(field_name='room')
    
    class Meta:
        model = Tenant
        fields = ['is_active', 'location', 'room_number', 'room']

class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.filter(is_deleted=False)
    serializer_class = TenantSerializer
    filterset_class = TenantFilter
    filter_backends = (filters.DjangoFilterBackend,)

    def list(self, request, *args, **kwargs):
        logger.info(f"获取租户列表，查询参数: {request.query_params}")
        queryset = self.filter_queryset(self.get_queryset())
        logger.info(f"过滤后的查询集: {queryset.query}")
        serializer = self.get_serializer(queryset, many=True)
        logger.info(f"返回 {len(serializer.data)} 条记录")
        return Response(serializer.data)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.is_active = False
        instance.save()
        logger.info(f"软删除租户: {instance.id}")

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        logger.info(f"更新租户: {instance.id}")
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def terminate(self, request, pk=None):
        tenant = self.get_object()
        tenant.is_active = False
        tenant.save()
        logger.info(f"终止租户合同: {tenant.id}")
        return Response({'status': 'contract terminated'})

    @action(detail=True, methods=['post'])
    def renew(self, request, pk=None):
        tenant = self.get_object()
        tenant.is_active = True
        tenant.save()
        logger.info(f"续租合同: {tenant.id}")
        return Response({'status': 'contract renewed'})

    @action(detail=True, methods=['get'])
    def contract_images(self, request, pk=None):
        tenant = self.get_object()
        images = tenant.contract_images.filter(is_deleted=False)
        serializer = TenantContractImageSerializer(images, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_contract_images(self, request, pk=None):
        tenant = self.get_object()
        images_data = request.data

        # 删除旧的图片记录
        tenant.contract_images.all().delete()

        # 创建新的图片记录
        for image_data in images_data:
            image_data['tenant'] = tenant.id
            serializer = TenantContractImageSerializer(data=image_data)
            if serializer.is_valid():
                serializer.save()
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        return Response({'status': 'contract images updated'})

    @action(detail=True, methods=['get', 'post'])
    def payment_history(self, request, pk=None):
        tenant = self.get_object()
        if request.method == 'POST':
            # 添加新的支付记录
            payment_data = request.data
            payment_data['tenant'] = tenant.id
            serializer = PaymentHistorySerializer(data=payment_data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            # 获取支付历史
            payments = tenant.payments.all().order_by('-payment_date')
            serializer = PaymentHistorySerializer(payments, many=True)
            return Response(serializer.data)
