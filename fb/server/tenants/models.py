from django.db import models
from rooms.models import Room

# Create your models here.

class Tenant(models.Model):
    name = models.CharField(max_length=100, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    id_number = models.CharField(max_length=18, null=True, blank=True)
    wechat_id = models.CharField(max_length=50, null=True, blank=True)
    check_in_date = models.DateField(null=True, blank=True)
    rent_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    payment_frequency = models.CharField(max_length=20, null=True, blank=True)
    is_active = models.BooleanField(default=True, null=True, blank=True)
    is_deleted = models.BooleanField(default=False, null=True, blank=True)
    last_payment_date = models.DateField(null=True, blank=True)
    last_payment_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='tenants')
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'tenants'

class TenantContractImage(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True, related_name='contract_images')
    name = models.CharField(max_length=100, null=True, blank=True)
    file_path = models.CharField(max_length=255, null=True, blank=True)
    type = models.CharField(max_length=20, default='contract', null=True, blank=True)
    is_deleted = models.BooleanField(default=False, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        db_table = 'tenant_contract_images'
