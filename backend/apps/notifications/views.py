from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.serializers import NotificationSerializer
from apps.notifications.services import NotificationService


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Notifications"],
        responses={200: NotificationSerializer(many=True)},
        summary="List user notifications",
    )
    def get(self, request):
        notifications = NotificationService.get_notifications(request.user)[:50]
        serializer = NotificationSerializer(notifications, many=True)
        unread_count = NotificationService.get_unread_count(request.user)
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
        if not NotificationService.notification_exists(public_id, request.user):
            return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
        NotificationService.mark_as_read([public_id], request.user)
        return Response({"detail": "Notification marked as read."})


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Notifications"],
        summary="Mark all notifications as read",
    )
    def post(self, request):
        count = NotificationService.mark_all_read(request.user)
        return Response({"detail": f"{count} notifications marked as read."})
