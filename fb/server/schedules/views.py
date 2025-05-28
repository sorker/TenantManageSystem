from django.shortcuts import render
from rest_framework import viewsets
from django_filters import rest_framework as filters
from .models import Schedule
from .serializers import ScheduleSerializer

# Create your views here.

class ScheduleFilter(filters.FilterSet):
    start_date = filters.DateFilter(field_name='date', lookup_expr='gte')
    end_date = filters.DateFilter(field_name='date', lookup_expr='lte')
    room_id = filters.NumberFilter(field_name='room_id')

    class Meta:
        model = Schedule
        fields = ['type', 'room_id', 'start_date', 'end_date']

class ScheduleViewSet(viewsets.ModelViewSet):
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer
    filterset_class = ScheduleFilter
