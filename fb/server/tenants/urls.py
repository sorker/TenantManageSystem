from django.urls import path
from . import views

urlpatterns = [
    path('', views.TenantListCreateView.as_view(), name='tenant-list-create'),
    path('<int:pk>/', views.TenantRetrieveUpdateDestroyView.as_view(), name='tenant-detail'),
] 