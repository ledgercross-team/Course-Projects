from django.shortcuts import render
from django.http import JsonResponse

from .models import Menu
from django.core import serializers
from .models import Booking
from datetime import datetime
import json
from .forms import BookingForm

from rest_framework import generics, viewsets
from rest_framework.permissions import IsAuthenticated
from .serializers import BookingSerializer, MenuSerializer


# Template-based views
def home(request):
    return render(request, 'index.html')

def about(request):
    return render(request, 'about.html')

def book(request):
    form = BookingForm()
    if request.method == 'POST':
        form = BookingForm(request.POST)
        if form.is_valid():
            form.save()
    context = {'form':form}
    return render(request, 'book.html', context)

def bookings(request):
    date = request.GET.get('date', datetime.today().date())
    bookings = Booking.objects.all()
    booking_json = serializers.serialize('json', bookings)
    return render(request, 'bookings.html', {"bookings": booking_json})

# API endpoint that returns JSON data filtered by date
def bookings_api(request):
    date = request.GET.get('date', datetime.today().strftime('%Y-%m-%d'))
    bookings = Booking.objects.filter(reservation_date=date)
    booking_json = serializers.serialize('json', bookings)
    return JsonResponse(json.loads(booking_json), safe=False)

def menu(request):
    menu_data = Menu.objects.all()
    main_data = {"menu": menu_data}
    return render(request, 'menu.html', {"menu": main_data})


def display_menu_item(request, pk=None): 
    if pk: 
        menu_item = Menu.objects.get(pk=pk) 
    else: 
        menu_item = "" 
    return render(request, 'menu_item.html', {"menu_item": menu_item}) 


# DRF API Views - Set up the Little Lemon booking API
class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]


class MenuItemsView(generics.ListCreateAPIView):
    queryset = Menu.objects.all()
    serializer_class = MenuSerializer
    permission_classes = [IsAuthenticated]


class SingleMenuItemView(generics.RetrieveUpdateAPIView):
    queryset = Menu.objects.all()
    serializer_class = MenuSerializer
    permission_classes = [IsAuthenticated]