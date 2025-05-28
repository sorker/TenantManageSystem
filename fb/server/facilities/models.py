from django.db import models

# Create your models here.

class Facility(models.Model):
    name = models.CharField(max_length=100, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        db_table = 'facilities'
        verbose_name_plural = 'facilities'

    def __str__(self):
        return self.name

class RoomFacility(models.Model):
    room = models.ForeignKey('rooms.Room', on_delete=models.CASCADE, null=True, blank=True, related_name='room_facilities')
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, null=True, blank=True, related_name='room_facilities')
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        db_table = 'room_facilities'
        unique_together = ('room', 'facility')
