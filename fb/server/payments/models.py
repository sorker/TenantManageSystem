from django.db import models
from tenants.models import Tenant

class PaymentHistory(models.Model):
    PAYMENT_TYPES = [
        ('rent', '租金'),
        ('deposit', '押金'),
        ('utility', '水电费'),
        ('other', '其他'),
    ]
    
    PAYMENT_METHODS = [
        ('cash', '现金'),
        ('bank_transfer', '银行转账'),
        ('alipay', '支付宝'),
        ('wechat', '微信支付'),
        ('other', '其他'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True, related_name='payments')
    payment_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHODS, null=True, blank=True)
    payment_type = models.CharField(max_length=50, choices=PAYMENT_TYPES, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        db_table = 'payment_history'
        ordering = ['-payment_date']

    def __str__(self):
        return f"{self.tenant.name} - {self.payment_date} - {self.amount}"
