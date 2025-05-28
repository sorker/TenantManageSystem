from rest_framework import serializers
from .models import Location

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['id', 'name', 'address', 'created_at', 'updated_at']

    def validate_name(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("位置名称不能为空")
        return value.strip()

    def validate_address(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("详细地址不能为空")
        return value.strip()

    def validate(self, data):
        if not data.get('name'):
            raise serializers.ValidationError({"name": "位置名称不能为空"})
        if not data.get('address'):
            raise serializers.ValidationError({"address": "详细地址不能为空"})
        return data 