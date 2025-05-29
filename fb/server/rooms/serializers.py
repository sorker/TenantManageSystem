from rest_framework import serializers
from .models import Room
from locations.models import Location
from locations.serializers import LocationSerializer
from facilities.serializers import FacilitySerializer
from facilities.models import Facility, RoomFacility
from tenants.serializers import TenantSerializer

class RoomSerializer(serializers.ModelSerializer):
    location = LocationSerializer(read_only=True)
    location_id = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(),
        source='location',
        write_only=True
    )
    facilities = serializers.SerializerMethodField()
    facility_ids = serializers.PrimaryKeyRelatedField(
        queryset=Facility.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    current_tenant = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            'id', 'location', 'location_id', 'room_number',
            'floor', 'is_occupied', 'facilities', 'facility_ids',
            'created_at', 'updated_at', 'current_tenant'
        ]

    def get_current_tenant(self, obj):
        """获取当前租客信息"""
        from tenants.models import Tenant
        current_tenant = Tenant.objects.filter(room=obj, is_active=True).first()
        if current_tenant:
            return TenantSerializer(current_tenant).data
        return None

    def get_facilities(self, obj):
        """获取房间的设施列表"""
        facilities = Facility.objects.filter(room_facilities__room_id=obj.id)
        facilities_data = FacilitySerializer(facilities, many=True).data
        return facilities_data

    def create(self, validated_data):
        print("开始创建房屋，原始数据:", validated_data)  # 添加日志
        facility_ids = validated_data.pop('facility_ids', [])
        print("提取的设施ID:", facility_ids)  # 添加日志
        
        # 创建房间
        room = Room.objects.create(**validated_data)
        print("创建的房间对象:", room)  # 添加日志
        print("房间ID:", room.id)  # 添加日志
        
        # 创建房间和设施的关联
        if facility_ids:
            print("开始创建设施关联")  # 添加日志
            for facility in facility_ids:
                room_facility = RoomFacility.objects.create(room=room, facility=facility)
                print(f"创建设施关联: 房间ID={room.id}, 设施ID={facility.id}, 关联ID={room_facility.id}")  # 添加日志
            print("设施关联创建完成")  # 添加日志
        
        # 验证设施关联是否创建成功
        room_facilities = RoomFacility.objects.filter(room=room)
        print("验证设施关联:", room_facilities)  # 添加日志
        print("关联的设施数量:", room_facilities.count())  # 添加日志
        
        return room

    def update(self, instance, validated_data):
        print("开始更新房屋，原始数据:", validated_data)  # 添加日志
        
        # 处理设施关系
        facility_ids = validated_data.pop('facility_ids', None)
        print("提取的设施ID:", facility_ids)  # 添加日志
        
        # 更新基本字段
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        print("更新后的房间对象:", instance)  # 添加日志
        
        # 更新设施关联
        if facility_ids is not None:
            print("开始更新设施关联")  # 添加日志
            # 删除旧的关联
            old_relations = RoomFacility.objects.filter(room=instance)
            print("删除旧的关联数量:", old_relations.count())  # 添加日志
            old_relations.delete()
            print("已删除旧关联")  # 添加日志
            
            # 创建新的关联
            for facility in facility_ids:
                room_facility = RoomFacility.objects.create(room=instance, facility=facility)
                print(f"创建新设施关联: 房间ID={instance.id}, 设施ID={facility.id}, 关联ID={room_facility.id}")  # 添加日志
            print("新设施关联创建完成")  # 添加日志
        
        # 验证设施关联是否更新成功
        room_facilities = RoomFacility.objects.filter(room=instance)
        print("验证更新后的设施关联:", room_facilities)  # 添加日志
        print("更新后的关联设施数量:", room_facilities.count())  # 添加日志
        
        return instance

    def to_representation(self, instance):
        """自定义数据表示，确保返回完整的设施信息"""
        data = super().to_representation(instance)
        
        # 获取关联的设施
        facilities = Facility.objects.filter(room_facilities__room_id=instance.id)
        
        # 序列化设施数据
        facilities_data = FacilitySerializer(facilities, many=True).data
        
        data['facilities'] = facilities_data
        return data 