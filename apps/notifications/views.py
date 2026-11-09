from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Notifications"],
        responses={200: NotificationSerializer(many=True)},
        summary="List user notifications",
    )
    def get(self, request):
        notifications = Notification.objects.filter(recipient=request.user).order_by("-created_at")[:50]
        serializer = NotificationSerializer(notifications, many=True)
        unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({
            "unread_count": unread_count,
            "notifications": serializer.data,
        })


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Notifications"],
        summary="Mark notification as read",
    )
    def post(self, request, public_id):
        try:
            notif = Notification.objects.get(public_id=public_id, recipient=request.user)
            notif.is_read = True
            notif.save(update_fields=["is_read"])
            return Response({"detail": "Notification marked as read."})
        except Notification.DoesNotExist:
            return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Notifications"],
        summary="Mark all notifications as read",
    )
    def post(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({"detail": f"{count} notifications marked as read."})
