from django.db import models
from locations.models import Location
from facilities.models import Facility, RoomFacility

class Room(models.Model):
    location = models.ForeignKey(Location, on_delete=models.CASCADE, null=True, blank=True, related_name='rooms')
    room_number = models.CharField(max_length=100, null=True, blank=True)
    floor = models.IntegerField(null=True, blank=True)
    is_occupied = models.BooleanField(default=False, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        db_table = 'rooms'

    def __str__(self):
        return f"{self.location.name} - {self.room_number}"

    @property
    def facilities(self):
        """获取房间的设施列表"""
        return Facility.objects.filter(room_facilities__room_id=self.id).distinct()
