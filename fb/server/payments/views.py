from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from django.db.models import Sum, Count, Avg, F, Q
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

class StatisticsViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def overview(self, request):
        # 获取查询参数
        date_type = request.query_params.get('dateType', 'month')
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        payment_type = request.query_params.get('paymentType')
        location_id = request.query_params.get('locationId')

        # 构建基础查询
        query = PaymentHistory.objects.all()

        # 应用过滤条件
        if payment_type:
            query = query.filter(payment_type=payment_type)
        if location_id:
            query = query.filter(tenant__room__location_id=location_id)

        # 根据日期类型过滤
        if date_type == 'year' and year:
            query = query.filter(payment_date__year=year)
        elif date_type == 'month' and month:
            year, month = month.split('-')
            query = query.filter(payment_date__year=year, payment_date__month=month)

        # 计算统计数据
        total_amount = query.aggregate(total=Sum('amount'))['total'] or 0
        payment_count = query.count()
        
        # 计算准时率
        on_time_count = query.filter(
            payment_date__lte=F('due_date')
        ).count()
        on_time_rate = (on_time_count / payment_count * 100) if payment_count > 0 else 0

        # 按支付类型分组统计
        type_stats = query.values('payment_type').annotate(
            payment_count=Count('id'),
            total_amount=Sum('amount'),
            average_amount=Avg('amount'),
            on_time_count=Count('id', filter=Q(payment_date__lte=F('due_date'))),
            total_count=Count('id')
        )

        # 计算趋势数据
        if date_type == 'year':
            trend_data = query.values('payment_date__month').annotate(
                total_amount=Sum('amount'),
                payment_count=Count('id')
            ).order_by('payment_date__month')
        else:
            trend_data = query.values('payment_date__day').annotate(
                total_amount=Sum('amount'),
                payment_count=Count('id')
            ).order_by('payment_date__day')

        return Response({
            'totalAmount': total_amount,
            'currentPeriodTotal': total_amount,
            'currentPeriodCount': payment_count,
            'onTimeRate': on_time_rate,
            'statisticsData': type_stats,
            'chartData': {
                'dates': [item['payment_date__month' if date_type == 'year' else 'payment_date__day'] for item in trend_data],
                'amounts': [float(item['total_amount'] or 0) for item in trend_data],
                'counts': [item['payment_count'] for item in trend_data]
            }
        })
