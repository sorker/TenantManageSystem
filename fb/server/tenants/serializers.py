from rest_framework import serializers
from .models import Tenant, TenantContractImage

class TenantContractImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantContractImage
        fields = ['id', 'name', 'file_path', 'type', 'created_at']

class TenantSerializer(serializers.ModelSerializer):
    contract_images = TenantContractImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'phone', 'id_number', 'wechat_id',
            'check_in_date', 'rent_amount', 'payment_frequency',
            'is_active', 'last_payment_date', 'last_payment_amount',
            'room', 'contract_images', 'created_at', 'updated_at'
        ] 