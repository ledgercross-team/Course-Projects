const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const Turf = require('./src/models/Turf');
const Booking = require('./src/models/Booking');
const Review = require('./src/models/Review');
const { USER_ROLES, TURF_STATUS, BOOKING_STATUS } = require('./src/utils/constants');

dotenv.config();

mongoose.connect(process.env.MONGO_URI);

const turfsData = [
  {
    name: 'Uttara Arena Football Club',
    area: 'Uttara',
    coords: [90.3950, 23.8759],
    sports: ['Football'],
    price: 2500,
    rating: 4.8,
    img: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80&w=800',
    desc: 'Floodlight equipped premium football turf in Uttara Sector 1.',
    opening: '06:00', closing: '23:00'
  },
  {
    name: 'Sector 4 Indoor Cricket Hub',
    area: 'Uttara',
    coords: [90.3990, 23.8680],
    sports: ['Cricket'],
    price: 3500,
    rating: 4.5,
    img: 'https://images.unsplash.com/photo-1531415080293-2f768a3d59cd?auto=format&fit=crop&q=80&w=800',
    desc: 'Professional indoor cricket facility in Uttara Sector 4.',
    opening: '08:00', closing: '22:00'
  },
  {
    name: 'Uttara High Noon Multi-Sport',
    area: 'Uttara',
    coords: [90.3900, 23.8720],
    sports: ['Football', 'Cricket'],
    price: 3000,
    rating: 4.2,
    img: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&q=80&w=800',
    desc: 'Versatile multi-purpose turf for community matches in Uttara.',
    opening: '06:00', closing: '21:00'
  },
  {
    name: 'Mirpur DOHS Sports City',
    area: 'Mirpur',
    coords: [90.3620, 23.8340],
    sports: ['Football'],
    price: 2200,
    rating: 4.7,
    img: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800',
    desc: 'Secure and high-quality football turf located in Mirpur DOHS.',
    opening: '06:00', closing: '23:30'
  },
  {
    name: 'Elite Cricket Academy Mirpur',
    area: 'Mirpur',
    coords: [90.3650, 23.8100],
    sports: ['Cricket'],
    price: 4000,
    rating: 4.9,
    img: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=800',
    desc: 'International standard cricket facility in the heart of Mirpur.',
    opening: '07:00', closing: '23:00'
  },
  {
    name: 'Mirpur Stadium Rooftop Turf',
    area: 'Mirpur',
    coords: [90.3600, 23.8050],
    sports: ['Football'],
    price: 2800,
    rating: 4.6,
    img: 'https://images.unsplash.com/photo-1510566337590-2fc1f21d0faa?auto=format&fit=crop&q=80&w=800',
    desc: 'Stunning rooftop football experience overlooking Mirpur Stadium.',
    opening: '10:00', closing: '22:00'
  },
  {
    name: 'Dhanmondi Club Turf',
    area: 'Dhanmondi',
    coords: [90.3770, 23.7460],
    sports: ['Football'],
    price: 3200,
    rating: 4.6,
    img: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&q=80&w=800',
    desc: 'Historic club turf with premium grass in Dhanmondi.',
    opening: '06:00', closing: '20:00'
  },
  {
    name: 'Abahani Field Premium Cricket',
    area: 'Dhanmondi',
    coords: [90.3700, 23.7500],
    sports: ['Cricket'],
    price: 4500,
    rating: 4.8,
    img: 'https://images.unsplash.com/photo-1593341646782-e0b495cff86d?auto=format&fit=crop&q=80&w=800',
    desc: 'The gold standard for cricket enthusiasts in Dhanmondi.',
    opening: '06:00', closing: '23:00'
  },
  {
    name: 'Gulshan Youth Club Grounds',
    area: 'Gulshan',
    coords: [90.4150, 23.7920],
    sports: ['Football', 'Cricket'],
    price: 4000,
    rating: 4.9,
    img: 'https://images.unsplash.com/photo-1518605336324-4829759e663e?auto=format&fit=crop&q=80&w=800',
    desc: 'Prime multi-sport facility in the elite Gulshan 2 area.',
    opening: '05:00', closing: '23:00'
  },
  {
    name: 'Niketon Sport Zone',
    area: 'Gulshan',
    coords: [90.4100, 23.7800],
    sports: ['Football'],
    price: 3500,
    rating: 4.4,
    img: 'https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&q=80&w=800',
    desc: 'Modern football arena in Niketon with excellent amenities.',
    opening: '06:00', closing: '22:30'
  },
  {
    name: 'Banani Field 11',
    area: 'Banani',
    coords: [90.4050, 23.7940],
    sports: ['Football'],
    price: 3800,
    rating: 4.7,
    img: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&q=80&w=800',
    desc: 'Top-tier artificial grass turf in Banani Road 11.',
    opening: '06:00', closing: '23:00'
  },
  {
    name: 'Chairman Bari Indoor Cricket',
    area: 'Banani',
    coords: [90.4000, 23.7880],
    sports: ['Cricket'],
    price: 4200,
    rating: 4.3,
    img: 'https://images.unsplash.com/photo-1606913084603-3e75a3399432?auto=format&fit=crop&q=80&w=800',
    desc: 'Elite indoor cricket training center in Banani.',
    opening: '08:00', closing: '21:00'
  },
  {
    name: 'Bashundhara Kings Complex',
    area: 'Bashundhara',
    coords: [90.4550, 23.8180],
    sports: ['Football', 'Cricket'],
    price: 5000,
    rating: 4.9,
    img: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800',
    desc: 'State-of-the-art sports complex in Bashundhara R/A.',
    opening: '06:00', closing: '23:00'
  },
  {
    name: 'P Block Mini Football Turf',
    area: 'Bashundhara',
    coords: [90.4600, 23.8250],
    sports: ['Football'],
    price: 2000,
    rating: 4.1,
    img: 'https://images.unsplash.com/photo-1431324155629-1a6eda1eed2d?auto=format&fit=crop&q=80&w=800',
    desc: 'Perfect for casual 5-a-side matches in Bashundhara Block P.',
    opening: '07:00', closing: '20:00'
  },
  {
    name: 'Badda Al-Amin Sports Club',
    area: 'Badda',
    coords: [90.4280, 23.7850],
    sports: ['Football'],
    price: 1800,
    rating: 4.2,
    img: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&q=80&w=800',
    desc: 'Affordable and well-maintained football turf in Badda.',
    opening: '06:00', closing: '22:00'
  },
  {
    name: 'Satarkul Cricket Hub',
    area: 'Badda',
    coords: [90.4350, 23.7900],
    sports: ['Cricket'],
    price: 2500,
    rating: 4.4,
    img: 'https://images.unsplash.com/photo-1589801258277-50e42706a298?auto=format&fit=crop&q=80&w=800',
    desc: 'Dedicated cricket hub with practice nets in Satarkul, Badda.',
    opening: '06:00', closing: '22:00'
  },
  {
    name: 'Khilkhet United Grounds',
    area: 'Khilkhet',
    coords: [90.4200, 23.8300],
    sports: ['Football'],
    price: 1900,
    rating: 4.5,
    img: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?auto=format&fit=crop&q=80&w=800',
    desc: 'Vibrant football ground for local teams in Khilkhet.',
    opening: '06:00', closing: '21:00'
  },
  {
    name: 'Nikunja Rooftop Sports',
    area: 'Khilkhet',
    coords: [90.4250, 23.8350],
    sports: ['Football'],
    price: 2400,
    rating: 4.6,
    img: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&q=80&w=800',
    desc: 'Enjoy night football with a breeze on this Nikunja rooftop.',
    opening: '09:00', closing: '23:00'
  },
  {
    name: 'Mohammadpur Physical Arena',
    area: 'Mohammadpur',
    coords: [90.3580, 23.7550],
    sports: ['Football'],
    price: 2100,
    rating: 4.7,
    img: 'https://images.unsplash.com/photo-1524015324113-ad97d9937265?auto=format&fit=crop&q=80&w=800',
    desc: 'Spacious football arena with international grade artificial grass.',
    opening: '06:00', closing: '22:00'
  },
  {
    name: 'Asad Gate Sports Zone',
    area: 'Mohammadpur',
    coords: [90.3650, 23.7600],
    sports: ['Cricket'],
    price: 2800,
    rating: 4.4,
    img: 'https://images.unsplash.com/photo-1587385789097-724d207ec224?auto=format&fit=crop&q=80&w=800',
    desc: 'Centrally located cricket facility near Asad Gate.',
    opening: '06:00', closing: '23:00'
  },
  {
    name: 'Banasree Block F Turf',
    area: 'Rampura',
    coords: [90.4350, 23.7650],
    sports: ['Football'],
    price: 1850,
    rating: 4.1,
    img: 'https://images.unsplash.com/photo-1563820250230-019912768565?auto=format&fit=crop&q=80&w=800',
    desc: 'Popular local football turf in Banasree Block F.',
    opening: '06:00', closing: '21:00'
  },
  {
    name: 'Aftabnagar Grand Arena',
    area: 'Rampura',
    coords: [90.4400, 23.7700],
    sports: ['Football', 'Cricket'],
    price: 3200,
    rating: 4.8,
    img: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&q=80&w=800',
    desc: 'Spacious and floodlit multi-sport arena in Aftabnagar.',
    opening: '06:00', closing: '23:00'
  },
  {
    name: 'Midnight Arena Dhaka',
    area: 'Gulshan',
    coords: [90.4180, 23.7950],
    sports: ['Football'],
    price: 4500,
    rating: 4.9,
    img: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&q=80&w=800',
    desc: 'The ultimate late-night football destination in Gulshan 2. Open all night.',
    opening: '18:00', closing: '06:00'
  },
  {
    name: 'Night Owl Futsal Zone',
    area: 'Banani',
    coords: [90.4030, 23.7910],
    sports: ['Football'],
    price: 3500,
    rating: 4.7,
    img: 'https://images.unsplash.com/photo-1524015324113-ad97d9937265?auto=format&fit=crop&q=80&w=800',
    desc: 'Elite futsal experience in Banani, optimized for overnight matches.',
    opening: '18:00', closing: '06:00'
  },
  {
    name: 'Floodlight Football Hub',
    area: 'Bashundhara',
    coords: [90.4580, 23.8210],
    sports: ['Football'],
    price: 4000,
    rating: 4.8,
    img: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&q=80&w=800',
    desc: 'Bashundhara’s premium floodlight facility. Perfect for corporate night games.',
    opening: '20:00', closing: '06:00'
  }
];

const seedData = async () => {
  try {
    await User.deleteMany();
    await Turf.deleteMany();
    await Booking.deleteMany();
    await Review.deleteMany();

    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@ledgerturf.com',
      password: 'password123',
      phone: '01711111111',
      role: USER_ROLES.SUPER_ADMIN,
    });

    const owners = [];
    const ownerNames = ['Rahat Ahmed', 'Salim Khan', 'Nafis Iqbal'];
    for (let i = 0; i < 3; i++) {
      const owner = await User.create({
        name: ownerNames[i],
        email: `owner${i+1}@gmail.com`,
        password: 'password123',
        phone: `0180000000${i+1}`,
        role: USER_ROLES.TURF_OWNER,
      });
      owners.push(owner);
    }

    for (let i = 0; i < turfsData.length; i++) {
      const d = turfsData[i];
      const turf = await Turf.create({
        owner: owners[i % owners.length]._id,
        name: d.name,
        description: d.desc,
        address: `${d.area}, Dhaka, Bangladesh`,
        location: {
          type: 'Point',
          coordinates: d.coords,
          city: 'Dhaka',
          area: d.area,
        },
        sportTypes: d.sports,
        pricePerHour: d.price,
        status: TURF_STATUS.APPROVED,
        isIndoor: d.name.toLowerCase().includes('indoor'),
        averageRating: d.rating,
        openingTime: d.opening || '06:00',
        closingTime: d.closing || '23:00',
        images: [d.img],
        mapLink: `https://www.google.com/maps/search/?api=1&query=${d.coords[1]},${d.coords[0]}`
      });

      await Review.create({
        user: admin._id,
        turf: turf._id,
        rating: Math.floor(d.rating),
        comment: 'Verified facility with excellent maintenance.'
      });
    }

    await User.create({
      name: 'Tamim Iqbal',
      email: 'player@gmail.com',
      password: 'password123',
      phone: '01900000000',
      role: USER_ROLES.PLAYER,
    });

    console.log(`Reseeded: 1 Admin, 3 Owners, ${turfsData.length} Turfs with verified coordinates and varied operating hours.`);
    process.exit();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
