from rest_framework import serializers
from .models import Tenant, TenantContractImage
from payments.models import PaymentHistory
from payments.serializers import PaymentHistorySerializer

class TenantContractImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantContractImage
        fields = ['id', 'name', 'file_path', 'type', 'created_at']

class TenantSerializer(serializers.ModelSerializer):
    contract_images = TenantContractImageSerializer(many=True, read_only=True)
    payment_history = serializers.SerializerMethodField()
    room_number = serializers.SerializerMethodField()
    
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'phone', 'id_number', 'wechat_id',
            'check_in_date', 'rent_amount', 'payment_frequency',
            'is_active', 'is_deleted', 'last_payment_date', 'last_payment_amount',
            'room', 'room_number', 'contract_images', 'payment_history',
            'created_at', 'updated_at'
        ]
    
    def get_payment_history(self, obj):
        payments = PaymentHistory.objects.filter(
            tenant=obj
        ).order_by('-payment_date')
        return PaymentHistorySerializer(payments, many=True).data
    
    def get_room_number(self, obj):
        return obj.room.room_number if obj.room else None 