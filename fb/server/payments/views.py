from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from .models import PaymentHistory
from .serializers import PaymentHistorySerializer

# Create your views here.

class PaymentHistoryFilter(filters.FilterSet):
    start_date = filters.DateFilter(field_name='payment_date', lookup_expr='gte')
    end_date = filters.DateFilter(field_name='payment_date', lookup_expr='lte')
    tenant_id = filters.NumberFilter(field_name='tenant_id')
    payment_type = filters.CharFilter(field_name='payment_type')
    payment_method = filters.CharFilter(field_name='payment_method')

    class Meta:
        model = PaymentHistory
        fields = ['tenant_id', 'payment_type', 'payment_method', 'start_date', 'end_date']

class PaymentHistoryViewSet(viewsets.ModelViewSet):
    queryset = PaymentHistory.objects.all()
    serializer_class = PaymentHistorySerializer
    filterset_class = PaymentHistoryFilter

    @action(detail=False, methods=['get'])
    def payment_overview(self, request):
        # 获取支付概览数据
        total_amount = PaymentHistory.objects.aggregate(
            total=Sum('amount')
        )['total'] or 0

        monthly_amount = PaymentHistory.objects.filter(
            payment_date__month=timezone.now().month,
            payment_date__year=timezone.now().year
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0

        payment_types = PaymentHistory.objects.values('payment_type').annotate(
            count=Count('id'),
            total=Sum('amount')
        )

        return Response({
            'total_amount': total_amount,
            'monthly_amount': monthly_amount,
            'payment_types': payment_types
        })

    @action(detail=False, methods=['get'])
    def payment_trend(self, request):
        # 获取支付趋势数据
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not start_date or not end_date:
            return Response(
                {'error': 'start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        payments = PaymentHistory.objects.filter(
            payment_date__range=[start_date, end_date]
        ).values('payment_date').annotate(
            total=Sum('amount')
        ).order_by('payment_date')

        return Response(payments)

    @action(detail=False, methods=['get'])
    def payment_distribution(self, request):
        # 获取支付分布数据
        payment_methods = PaymentHistory.objects.values('payment_method').annotate(
            count=Count('id'),
            total=Sum('amount')
        )

        return Response(payment_methods)

    @action(detail=False, methods=['get'])
    def overdue_analysis(self, request):
        # 获取逾期分析数据
        today = timezone.now().date()
        overdue_payments = PaymentHistory.objects.filter(
            due_date__lt=today,
            payment_date__isnull=True
        ).values('tenant__name', 'due_date', 'amount')

        return Response(overdue_payments)

    @action(detail=False, methods=['get'])
    def upcoming_payments(self, request):
        # 获取即将到期的付款
        today = timezone.now().date()
        next_week = today + timedelta(days=7)
        
        upcoming = PaymentHistory.objects.filter(
            due_date__range=[today, next_week],
            payment_date__isnull=True
        ).values('tenant__name', 'due_date', 'amount')

        return Response(upcoming)
