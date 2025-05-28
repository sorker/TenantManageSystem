from django.db import models
from rooms.models import Room

class Schedule(models.Model):
    title = models.CharField(max_length=100, null=True, blank=True)
    type = models.CharField(max_length=50, null=True, blank=True)
    date = models.DateField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='schedules')
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        db_table = 'schedules'

    def __str__(self):
        return f"{self.title} - {self.date}"
