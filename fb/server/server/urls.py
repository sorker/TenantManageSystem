"""
URL configuration for server project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tenants.views import TenantViewSet
from locations.views import LocationViewSet
from rooms.views import RoomViewSet
from facilities.views import FacilityViewSet, RoomFacilityViewSet
from schedules.views import ScheduleViewSet
from payments.views import PaymentHistoryViewSet, StatisticsViewSet
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from django.db import connection
from django.views.decorators.csrf import csrf_exempt
import logging

logger = logging.getLogger(__name__)

# 创建路由器并设置trailing_slash=True
router = DefaultRouter(trailing_slash=True)
router.register(r'tenants', TenantViewSet, basename='tenant')
router.register(r'locations', LocationViewSet, basename='location')
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'facilities', FacilityViewSet, basename='facility')
router.register(r'room-facilities', RoomFacilityViewSet, basename='room-facility')
router.register(r'schedules', ScheduleViewSet, basename='schedule')
router.register(r'payments', PaymentHistoryViewSet, basename='payment')
router.register(r'statistics', StatisticsViewSet, basename='statistics')

@csrf_exempt
def get_tables(request):
    try:
        logger.info("开始获取数据库表列表")
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' 
                AND name NOT LIKE 'sqlite_%'
                AND name NOT LIKE 'django_%'
                AND name NOT LIKE 'auth_%'
            """)
            tables = [row[0] for row in cursor.fetchall()]
            logger.info(f"成功获取到 {len(tables)} 个表")
        return JsonResponse({'tables': tables})
    except Exception as e:
        logger.error(f"获取数据库表列表失败: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def get_table_schema(request, table_name):
    try:
        logger.info(f"开始获取表 {table_name} 的结构")
        with connection.cursor() as cursor:
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            schema = [
                {
                    'cid': col[0],
                    'name': col[1],
                    'type': col[2],
                    'notnull': bool(col[3]),
                    'dflt_value': col[4],
                    'pk': bool(col[5])
                }
                for col in columns
            ]
            logger.info(f"成功获取表 {table_name} 的结构，共 {len(schema)} 个字段")
        return JsonResponse({'schema': schema})
    except Exception as e:
        logger.error(f"获取表 {table_name} 的结构失败: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def get_table_data(request, table_name):
    try:
        logger.info(f"开始获取表 {table_name} 的数据")
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT * FROM {table_name}")
            columns = [col[0] for col in cursor.description]
            data = [
                dict(zip(columns, row))
                for row in cursor.fetchall()
            ]
            logger.info(f"成功获取表 {table_name} 的数据，共 {len(data)} 条记录")
        return JsonResponse({'data': data})
    except Exception as e:
        logger.error(f"获取表 {table_name} 的数据失败: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/database/tables/', get_tables, name='database-tables'),
    path('api/database/tables/<str:table_name>/schema/', get_table_schema, name='table-schema'),
    path('api/database/tables/<str:table_name>/data/', get_table_data, name='table-data'),
    path('', lambda request: JsonResponse({'message': '服务器运行正常'})),
]

# 媒体文件服务
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
