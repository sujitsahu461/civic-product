from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai_predictions.models import AIPredictionLog
from apps.ai_predictions.serializers import (
    AICityInsightsSerializer,
    AIDuplicateCheckRequestSerializer,
    AIDuplicateMatchSerializer,
    AIPredictionLogSerializer,
    AITriageRequestSerializer,
    AITriageResponseSerializer,
)
from apps.ai_predictions.services import (
    AIDuplicateDetectorService,
    AIInsightService,
    AITriageService,
)
from apps.complaints.models import Complaint


class AITriageClassifyView(APIView):
    """Classify grievance text and predict urgency, priority, and hazard tags."""

    permission_classes = [AllowAny]
    throttle_scope = "ai"

    @extend_schema(
        summary="AI automated complaint triage & classification",
        request=AITriageRequestSerializer,
        responses={
            200: AITriageResponseSerializer,
            400: OpenApiResponse(description="Invalid request payload"),
        },
        tags=["AI Predictions"],
    )
    def post(self, request):
        serializer = AITriageRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        result = AITriageService.classify_complaint(
            title=data.get("title", ""),
            description=data.get("description", ""),
            location_address=data.get("location_address", ""),
            save_log=False,
        )
        return Response(
            AITriageResponseSerializer(result).data,
            status=status.HTTP_200_OK,
        )


class AIDuplicateDetectionView(APIView):
    """Scan open complaints to identify duplicate grievances using geospatial proximity and NLP."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="AI duplicate complaint detection",
        request=AIDuplicateCheckRequestSerializer,
        responses={
            200: AIDuplicateMatchSerializer(many=True),
            400: OpenApiResponse(description="Validation error"),
        },
        tags=["AI Predictions"],
    )
    def post(self, request):
        serializer = AIDuplicateCheckRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        matches = AIDuplicateDetectorService.find_potential_duplicates(
            title=data["title"],
            description=data["description"],
            category=data["category"],
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            radius_km=data.get("radius_km", 1.5),
        )
        return Response(
            AIDuplicateMatchSerializer(matches, many=True).data,
            status=status.HTTP_200_OK,
        )


class AICityInsightsView(APIView):
    """Retrieve city-wide predictive insights, hazard alerts, and category distributions."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get city-wide AI civic insights",
        responses={200: AICityInsightsSerializer},
        tags=["AI Predictions"],
    )
    def get(self, request):
        insights = AIInsightService.get_city_insights()
        return Response(
            AICityInsightsSerializer(insights).data,
            status=status.HTTP_200_OK,
        )


class ComplaintAIPredictionView(APIView):
    """Retrieve or generate AI predictions for a specific complaint."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get AI analysis for a complaint",
        responses={
            200: AITriageResponseSerializer,
            404: OpenApiResponse(description="Complaint not found"),
        },
        tags=["AI Predictions"],
    )
    def get(self, request, complaint_public_id):
        try:
            complaint = Complaint.objects.get(public_id=complaint_public_id)
        except Complaint.DoesNotExist:
            raise NotFound("Complaint not found.")

        # Classify and return
        prediction = AITriageService.classify_complaint(
            title=complaint.title,
            description=complaint.description,
            location_address=complaint.location_address,
            save_log=True,
            complaint=complaint,
        )
        return Response(
            AITriageResponseSerializer(prediction).data,
            status=status.HTTP_200_OK,
        )
