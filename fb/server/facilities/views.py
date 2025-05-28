from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
import logging
from .models import Facility, RoomFacility
from .serializers import FacilitySerializer, RoomFacilitySerializer

logger = logging.getLogger(__name__)

# Create your views here.

class FacilityViewSet(viewsets.ModelViewSet):
    queryset = Facility.objects.all()
    serializer_class = FacilitySerializer

    def list(self, request, *args, **kwargs):
        try:
            logger.info("获取设施列表")
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            logger.info(f"成功获取 {len(queryset)} 个设施")
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"获取设施列表失败: {str(e)}")
            return Response(
                {"error": "获取设施列表失败"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        try:
            logger.info(f"创建设施请求数据: {request.data}")
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                instance = serializer.save()
                logger.info(f"设施创建成功: {serializer.data}")
                response_serializer = self.get_serializer(instance)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            logger.error(f"数据验证失败: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"创建设施失败: {str(e)}")
            return Response(
                {"error": "创建设施失败"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class RoomFacilityViewSet(viewsets.ModelViewSet):
    queryset = RoomFacility.objects.all()
    serializer_class = RoomFacilitySerializer

    def get_queryset(self):
        queryset = RoomFacility.objects.all()
        room_id = self.request.query_params.get('room_id', None)
        if room_id is not None:
            queryset = queryset.filter(room_id=room_id)
        return queryset
