from rest_framework import serializers
from .models import Schedule
from rooms.models import Room
from rooms.serializers import RoomSerializer

class ScheduleSerializer(serializers.ModelSerializer):
    room = RoomSerializer(read_only=True)
    room_id = serializers.PrimaryKeyRelatedField(
        queryset=Room.objects.all(),
        source='room',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = Schedule
        fields = [
            'id', 'title', 'type', 'date', 'description',
            'room', 'room_id', 'created_at', 'updated_at'
        ] 