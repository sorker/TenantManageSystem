from rest_framework import serializers
from .models import PaymentHistory
from tenants.models import Tenant
from tenants.serializers import TenantSerializer

class PaymentHistorySerializer(serializers.ModelSerializer):
    tenant = TenantSerializer(read_only=True)
    tenant_id = serializers.PrimaryKeyRelatedField(
        queryset=Tenant.objects.all(),
        source='tenant',
        write_only=True
    )

    class Meta:
        model = PaymentHistory
        fields = [
            'id', 'tenant', 'tenant_id', 'payment_date',
            'due_date', 'amount', 'payment_method',
            'payment_type', 'notes', 'created_at'
        ] 