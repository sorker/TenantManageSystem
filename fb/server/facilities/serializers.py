from rest_framework import serializers
from .models import Facility, RoomFacility

class FacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Facility
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']

    def validate_name(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("设施名称不能为空")
        return value.strip()

    def validate_description(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("设施描述不能为空")
        return value.strip()

    def validate(self, data):
        if not data.get('name'):
            raise serializers.ValidationError({"name": "设施名称不能为空"})
        if not data.get('description'):
            raise serializers.ValidationError({"description": "设施描述不能为空"})
        return data

class RoomFacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomFacility
        fields = ['room', 'facility', 'created_at'] 