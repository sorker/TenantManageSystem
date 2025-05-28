from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
import logging
from .models import Location
from .serializers import LocationSerializer

logger = logging.getLogger(__name__)

# Create your views here.

class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer

    def create(self, request, *args, **kwargs):
        logger.info(f"创建位置请求数据: {request.data}")
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            logger.info("数据验证通过")
            instance = serializer.save()
            logger.info(f"位置创建成功: {serializer.data}")
            # 重新获取序列化后的数据
            response_serializer = self.get_serializer(instance)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        logger.error(f"数据验证失败: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        serializer.save()
