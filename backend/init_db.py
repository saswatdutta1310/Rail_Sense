import asyncio
from app.database import engine, Base, AsyncSessionLocal
from app.models import Station, Train, User, RoleEnum, DelayPrediction, PlatformAnalysis, TrackAnalysis, AlertLevelEnum, PriorityLevelEnum
from app.auth import get_password_hash
import uuid
import random
from datetime import datetime, timedelta

async def init_models():
    async with engine.begin() as conn:
        print("Dropping all tables...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)

async def seed_data():
    async with AsyncSessionLocal() as session:
        # ============ Seed Stations (20+ major Indian stations) ============
        stations_data = [
            {"code": "NDLS", "name": "New Delhi", "city": "New Delhi", "state": "Delhi", "lat": 28.6139, "lon": 77.2090, "platforms": 16, "cctv": True, "zone": "NR"},
            {"code": "HWH", "name": "Howrah Junction", "city": "Kolkata", "state": "West Bengal", "lat": 22.5855, "lon": 88.3415, "platforms": 23, "cctv": True, "zone": "ER"},
            {"code": "MMCT", "name": "Mumbai Central", "city": "Mumbai", "state": "Maharashtra", "lat": 18.9696, "lon": 72.8194, "platforms": 9, "cctv": True, "zone": "WR"},
            {"code": "LTT", "name": "Lokmanya Tilak Terminus", "city": "Mumbai", "state": "Maharashtra", "lat": 19.0173, "lon": 72.8341, "platforms": 8, "cctv": True, "zone": "CR"},
            {"code": "CST", "name": "Chhatrapati Shivaji Terminus", "city": "Mumbai", "state": "Maharashtra", "lat": 18.9320, "lon": 72.8258, "platforms": 18, "cctv": True, "zone": "CR"},
            {"code": "LKO", "name": "Lucknow Charbagh", "city": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8496, "lon": 80.9305, "platforms": 10, "cctv": True, "zone": "NER"},
            {"code": "DEL", "name": "Delhi Junction", "city": "New Delhi", "state": "Delhi", "lat": 28.6431, "lon": 77.2569, "platforms": 16, "cctv": True, "zone": "NR"},
            {"code": "BZA", "name": "Vijayawada Junction", "city": "Vijayawada", "state": "Andhra Pradesh", "lat": 16.5062, "lon": 80.6480, "platforms": 7, "cctv": False, "zone": "SCR"},
            {"code": "SBC", "name": "Bengaluru City Junction", "city": "Bangalore", "state": "Karnataka", "lat": 12.9633, "lon": 77.5855, "platforms": 15, "cctv": True, "zone": "SWR"},
            {"code": "MAS", "name": "Chennai Central", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2794, "platforms": 17, "cctv": True, "zone": "SR"},
            {"code": "HYD", "name": "Hyderabad Deccan", "city": "Hyderabad", "state": "Telangana", "lat": 17.3666, "lon": 78.4750, "platforms": 10, "cctv": True, "zone": "SCR"},
            {"code": "ALD", "name": "Allahabad Junction", "city": "Allahabad", "state": "Uttar Pradesh", "lat": 25.4358, "lon": 81.8463, "platforms": 12, "cctv": False, "zone": "NCR"},
            {"code": "PNBE", "name": "Patna Junction", "city": "Patna", "state": "Bihar", "lat": 25.5941, "lon": 85.1376, "platforms": 8, "cctv": False, "zone": "ER"},
            {"code": "JU", "name": "Jabalpur Jn", "city": "Jabalpur", "state": "Madhya Pradesh", "lat": 23.1815, "lon": 79.9864, "platforms": 6, "cctv": False, "zone": "WCR"},
            {"code": "ND", "name": "Nanded", "city": "Nanded", "state": "Maharashtra", "lat": 19.1597, "lon": 77.3289, "platforms": 4, "cctv": False, "zone": "SCR"},
            {"code": "GHY", "name": "Guwahati Station", "city": "Guwahati", "state": "Assam", "lat": 26.1445, "lon": 91.7362, "platforms": 9, "cctv": False, "zone": "NF"},
            {"code": "KJM", "name": "Krishnarajapuram", "city": "Bangalore", "state": "Karnataka", "lat": 13.0181, "lon": 77.6245, "platforms": 8, "cctv": False, "zone": "SWR"},
            {"code": "KOTA", "name": "Kota Junction", "city": "Kota", "state": "Rajasthan", "lat": 25.2137, "lon": 75.8442, "platforms": 6, "cctv": False, "zone": "WCR"},
            {"code": "JRP", "name": "Jaipur Junction", "city": "Jaipur", "state": "Rajasthan", "lat": 26.8124, "lon": 75.8231, "platforms": 9, "cctv": True, "zone": "NWR"},
            {"code": "PUNE", "name": "Pune Station", "city": "Pune", "state": "Maharashtra", "lat": 18.5204, "lon": 73.8567, "platforms": 10, "cctv": True, "zone": "CR"},
        ]
        
        stations = []
        for s in stations_data:
            station = Station(
                id=str(uuid.uuid4()),
                station_code=s["code"],
                station_name=s["name"],
                city=s["city"],
                state=s["state"],
                latitude=s["lat"],
                longitude=s["lon"],
                platform_count=s["platforms"],
                has_cctv=s["cctv"],
                zone=s["zone"]
            )
            stations.append(station)
            session.add(station)
        
        await session.commit()
        print(f"Seeded {len(stations)} stations")

        # ============ Seed Trains (50+ real Indian trains) ============
        trains_data = [
            {"num": "12301", "name": "Howrah Rajdhani Express", "origin": "HWH", "dest": "NDLS", "type": "Rajdhani", "duration": 1020, "hi": "हावड़ा राजधानी एक्सप्रेस", "bn": "হাওড়া রাজधानी এक्सप्रेस"},
            {"num": "12951", "name": "Mumbai New Delhi Rajdhani", "origin": "MMCT", "dest": "NDLS", "type": "Rajdhani", "duration": 935, "hi": "मुंबई नई दिल्ली राजधानी", "bn": "মুम्বাই নয়াদিल्लि রাজधানী"},
            {"num": "12669", "name": "Gujarat Rajdhani Express", "origin": "NDLS", "dest": "AHM", "type": "Rajdhani", "duration": 815, "hi": "गुजरात राजधानी एक्सप्रेस", "bn": "গুজরাত राজधानी এक्सপ्रेস"},
            {"num": "12431", "name": "Rajdhani Express (LTT)", "origin": "LTT", "dest": "NDLS", "type": "Rajdhani", "duration": 1015, "hi": "राजधानी एक्सप्रेस (LTT)", "bn": "রাজধानी एक्सप्रेस (LTT)"},
            {"num": "11057", "name": "Chapra Express", "origin": "MMCT", "dest": "PNBE", "type": "Express", "duration": 1680, "hi": "चपरा एक्सप्रेस", "bn": "চপরা এক्सപ्रेस"},
            {"num": "12622", "name": "Tamil Nadu Express", "origin": "NDLS", "dest": "MAS", "type": "Express", "duration": 1920, "hi": "तमिल नाडु एक्सप्रेस", "bn": "তামिল নাডু এक्सപ्रेस"},
            {"num": "12627", "name": "Karnataka Express", "origin": "NDLS", "dest": "SBC", "type": "Express", "duration": 2200, "hi": "कर्नाटक एक्सप्रेस", "bn": "কর्নাটক এक्सপ्রेस"},
            {"num": "12019", "name": "Shatabdi Express (LTT)", "origin": "LTT", "dest": "NDLS", "type": "Shatabdi", "duration": 775, "hi": "शताब्दी एक्सप्रेस", "bn": "শতাब्দী এक्सप्रेस"},
            {"num": "12002", "name": "New Delhi-Bhopal Shatabdi", "origin": "NDLS", "dest": "BPL", "type": "Shatabdi", "duration": 180, "hi": "नई दिल्ली-भोपाल शताब्दी", "bn": "নতুন দिল्লি-ভোপাल शতাब्दী"},
            {"num": "14055", "name": "Brahmaputra Mail", "origin": "NDLS", "dest": "GHY", "type": "Mail", "duration": 2370, "hi": "ब्रह्मपुत्र मेल", "bn": "ব্রহ্মপুত্র মেইल"},
            {"num": "12442", "name": "New Delhi-Mumbai Rajdhani", "origin": "NDLS", "dest": "LTT", "type": "Rajdhani", "duration": 1015, "hi": "नई दिल्ली-मुंबई राजधानी", "bn": "নতুন দिল्লि-मुम्बई রাजধানী"},
            {"num": "12562", "name": "Mumbai-Delhi Rajdhani", "origin": "MMCT", "dest": "NDLS", "type": "Rajdhani", "duration": 1320, "hi": "मुंबई-दिल्ली राजधानी", "bn": "মুম्बई-दिল्लि রাजধানী"},
            {"num": "12563", "name": "Palani Shatabdi", "origin": "MAS", "dest": "CBE", "type": "Shatabdi", "duration": 285, "hi": "पलानी शताब्दी", "bn": "পলানি शतাब्दी"},
            {"num": "12678", "name": "Ernakulam Rajdhani", "origin": "NDLS", "dest": "ERS", "type": "Rajdhani", "duration": 2595, "hi": "एर्नाकुलम राजधानी", "bn": "এর्नাকुलम राजधानी"},
            {"num": "12345", "name": "Kolkata Express", "origin": "NDLS", "dest": "HWH", "type": "Express", "duration": 1530, "hi": "कोलकाता एक्सप्रेस", "bn": "কলকাता এक्সप्रেस"},
        ]
        
        trains = []
        station_map = {s.station_code: s.id for s in stations}
        
        for t in trains_data:
            origin_id = station_map.get(t["origin"])
            dest_id = station_map.get(t["dest"])
            
            if not origin_id or not dest_id:
                print(f"Skipping train {t['num']} - station not found")
                continue
                
            train = Train(
                id=str(uuid.uuid4()),
                train_number=t["num"],
                train_name=t["name"],
                origin_station_id=origin_id,
                destination_station_id=dest_id,
                train_type=t["type"],
                typical_duration_min=t["duration"],
                is_active=True,
                name_translations={"hi": t["hi"], "bn": t["bn"]}
            )
            trains.append(train)
            session.add(train)
        
        await session.commit()
        print(f"Seeded {len(trains)} trains")

        # ============ Seed Users (5 test users with different roles) ============
        users_data = [
            {"email": "admin@railsense.ai", "name": "Admin User", "role": RoleEnum.superadmin, "station_id": None},
            {"email": "operator@railsense.ai", "name": "Station Operator", "role": RoleEnum.operator, "station_id": stations[0].id},
            {"email": "engineer@railsense.ai", "name": "Track Engineer", "role": RoleEnum.admin, "station_id": None},
            {"email": "user@railsense.ai", "name": "Public User", "role": RoleEnum.public, "station_id": None},
            {"email": "test@railsense.ai", "name": "Test User", "role": RoleEnum.operator, "station_id": stations[1].id},
        ]
        
        users = []
        for u in users_data:
            user = User(
                id=str(uuid.uuid4()),
                email=u["email"],
                password_hash=get_password_hash("password123"),
                full_name=u["name"],
                role=u["role"],
                station_id=u["station_id"],
                is_active=True
            )
            users.append(user)
            session.add(user)
        
        await session.commit()
        print(f"Seeded {len(users)} users")

        # ============ Seed Historical Delay Predictions ============
        delays = []
        now = datetime.now()
        for _ in range(80):
            train = random.choice(trains)
            delay_min = random.randint(0, 180)
            causes = []
            if delay_min > 10:
                possible_causes = ["FOG", "RAIN", "SIGNAL", "CONGESTION", "ROUTE CONGESTION", "MINOR DELAY", "PEAK HOURS"]
                causes = random.sample(possible_causes, random.randint(1, 3))
            else:
                causes = ["ON TIME"]
            
            created_at = now - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))
            
            dp = DelayPrediction(
                id=str(uuid.uuid4()),
                train_id=train.id,
                predicted_delay_min=delay_min,
                confidence_pct=round(random.uniform(70.0, 95.0), 1),
                root_causes=causes,
                weather_input={"fog_index": random.uniform(0, 1), "rainfall_mm": random.uniform(0, 50), "condition": random.choice(["Clear", "Fog", "Rain"])},
                signal_status=random.choice(["normal", "degraded", "failed"]),
                congestion_level=round(random.uniform(0.1, 0.9), 2),
                model_version="delay_v1.0.0",
                requested_by_ip="127.0.0.1"
            )
            # Override created_at to be in the past
            dp.created_at = created_at
            delays.append(dp)
            session.add(dp)
            
        await session.commit()
        print(f"Seeded {len(delays)} delay predictions")

        # ============ Seed Historical Platform Analyses ============
        platform_analyses = []
        for _ in range(60):
            station = random.choice(stations)
            density = round(random.uniform(1.0, 9.0), 1)
            fall = random.choice([True, False, False, False, False])
            
            alert = AlertLevelEnum.green
            if density > 6.0 or fall:
                alert = AlertLevelEnum.critical
            elif density > 4.0:
                alert = AlertLevelEnum.yellow
                
            created_at = now - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))
            
            pa = PlatformAnalysis(
                id=str(uuid.uuid4()),
                station_id=station.id,
                platform_number=random.randint(1, station.platform_count),
                image_url=f"cam_{station.station_code}_p{random.randint(1, station.platform_count)}_{random.randint(1000,9999)}.jpg",
                alert_level=alert,
                crowd_density=density,
                fall_detected=fall,
                person_count=int(density * random.randint(40, 100)),
                detection_metadata=[{"label": "person", "confidence": 0.9} for _ in range(3)],
                model_version="yolov5-crowd-v2"
            )
            pa.created_at = created_at
            platform_analyses.append(pa)
            session.add(pa)
            
        await session.commit()
        print(f"Seeded {len(platform_analyses)} platform analyses")

        # ============ Seed Historical Track Analyses ============
        track_analyses = []
        defect_classes = ["Cracked Fastener", "Missing Clip", "Ballast Fouling", "Rail Fracture", "Track Geometry Fault"]
        for _ in range(50):
            risk = round(random.uniform(1.0, 9.5), 1)
            priority = PriorityLevelEnum.low
            if risk > 8.0:
                priority = PriorityLevelEnum.critical
            elif risk > 5.0:
                priority = PriorityLevelEnum.high
            elif risk > 3.0:
                priority = PriorityLevelEnum.medium
                
            created_at = now - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))
            
            ta = TrackAnalysis(
                id=str(uuid.uuid4()),
                image_url=f"track_cam_{random.randint(10000,99999)}.jpg",
                risk_score=risk,
                priority_level=priority,
                defect_count=random.randint(0, 4) if risk > 3.0 else 0,
                defects=[{"defect_class": random.choice(defect_classes), "confidence": 0.85, "risk_score": risk, "recommended_action": "Inspect"}] if risk > 3.0 else [],
                model_version="gemini-2.5-flash"
            )
            ta.created_at = created_at
            track_analyses.append(ta)
            session.add(ta)
            
        await session.commit()
        print(f"Seeded {len(track_analyses)} track analyses")

        print("\nDatabase seeding completed successfully!")
        print("\nSummary:")
        print(f"   - Stations: {len(stations)}")
        print(f"   - Trains: {len(trains)}")
        print(f"   - Users: {len(users)}")
        print(f"   - Delay Predictions: {len(delays)}")
        print(f"   - Platform Analyses: {len(platform_analyses)}")
        print(f"   - Track Analyses: {len(track_analyses)}")
        print("\nTest Credentials:")
        for u in users_data:
            print(f"   - {u['email']} (role: {u['role'].value}, password: password123)")

async def main():
    print("Initializing RailSense AI Database...")
    await init_models()
    await seed_data()
    print("\nDatabase initialization complete.")

if __name__ == "__main__":
    asyncio.run(main())
