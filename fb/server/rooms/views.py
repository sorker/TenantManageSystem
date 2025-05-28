from django.shortcuts import render
from rest_framework import viewsets
from .models import Room
from .serializers import RoomSerializer
from rest_framework.response import Response

# Create your views here.

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

    def get_queryset(self):
        queryset = Room.objects.all()
        
        location_id = self.request.query_params.get('location_id', None)
        if location_id is not None:
            queryset = queryset.filter(location_id=location_id)
            
        return queryset

    def perform_create(self, serializer):
        print("创建请求数据:", self.request.data)  # 添加日志
        instance = serializer.save()
        print("创建后的实例:", instance)  # 添加日志
        return instance

    def perform_update(self, serializer):
        print("更新请求数据:", self.request.data)  # 添加日志
        instance = serializer.save()
        print("更新后的实例:", instance)  # 添加日志
        return instance

    def list(self, request, *args, **kwargs):
        print("开始获取列表")  # 添加日志
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        print("序列化后的数据:", serializer.data)  # 添加日志
        return Response(serializer.data)
