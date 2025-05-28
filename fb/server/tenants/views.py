from django.shortcuts import render
from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Tenant, TenantContractImage
from .serializers import TenantSerializer, TenantContractImageSerializer

# Create your views here.

class TenantListCreateView(generics.ListCreateAPIView):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer

class TenantRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer

class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.filter(is_deleted=False)
    serializer_class = TenantSerializer

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()

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

    @action(detail=True, methods=['get'])
    def payment_history(self, request, pk=None):
        tenant = self.get_object()
        payments = tenant.payments.all().order_by('-payment_date')
        from payments.serializers import PaymentHistorySerializer
        serializer = PaymentHistorySerializer(payments, many=True)
        return Response(serializer.data)
