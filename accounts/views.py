from django.contrib.auth import get_user_model
from rest_framework import generics

from .serializers import RegisterSerializer

User = get_user_model()


class RegisterAPIView(
    generics.CreateAPIView
):
    queryset = User.objects.all()

    serializer_class = RegisterSerializer