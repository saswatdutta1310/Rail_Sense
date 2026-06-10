import asyncio
from app.database import engine, Base, AsyncSessionLocal
from app.models import Station, Train, User, RoleEnum
import uuid

async def init_models():
    async with engine.begin() as conn:
        print("Dropping all tables...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)

async def seed_data():
    async with AsyncSessionLocal() as session:
        # Seed Stations
        s1 = Station(
            id=str(uuid.uuid4()),
            station_code="NDLS",
            station_name="New Delhi",
            city="New Delhi",
            state="Delhi",
            latitude=28.6139,
            longitude=77.2090,
            platform_count=16,
            has_cctv=True,
            zone="NR"
        )
        s2 = Station(
            id=str(uuid.uuid4()),
            station_code="HWH",
            station_name="Howrah Junction",
            city="Kolkata",
            state="West Bengal",
            latitude=22.5855,
            longitude=88.3415,
            platform_count=23,
            has_cctv=True,
            zone="ER"
        )
        s3 = Station(
            id=str(uuid.uuid4()),
            station_code="MMCT",
            station_name="Mumbai Central",
            city="Mumbai",
            state="Maharashtra",
            latitude=18.9696,
            longitude=72.8194,
            platform_count=9,
            has_cctv=True,
            zone="WR"
        )

        session.add_all([s1, s2, s3])
        await session.commit()

        # Seed Trains
        t1 = Train(
            id=str(uuid.uuid4()),
            train_number="12301",
            train_name="Howrah Rajdhani Express",
            name_translations={"hi": "हावड़ा राजधानी एक्सप्रेस", "bn": "হাওড়া রাজধানী এক্সপ্রেস"},
            origin_station_id=s2.id,
            destination_station_id=s1.id,
            train_type="Rajdhani",
            typical_duration_min=1020,
            is_active=True
        )
        t2 = Train(
            id=str(uuid.uuid4()),
            train_number="12951",
            train_name="Mumbai New Delhi Rajdhani",
            name_translations={"hi": "मुंबई नई दिल्ली राजधानी", "bn": "মুম্বাই নয়াদিল্লি রাজধানী"},
            origin_station_id=s3.id,
            destination_station_id=s1.id,
            train_type="Rajdhani",
            typical_duration_min=935,
            is_active=True
        )

        session.add_all([t1, t2])
        await session.commit()

        # Seed Admin User
        admin = User(
            id=str(uuid.uuid4()),
            email="admin@railsense.ai",
            password_hash="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", # "password"
            role=RoleEnum.admin,
            full_name="RailSense Admin"
        )
        session.add(admin)
        await session.commit()

        print("Data seeded successfully.")

async def main():
    print("Initializing Database...")
    await init_models()
    await seed_data()
    print("Initialization Complete.")

if __name__ == "__main__":
    asyncio.run(main())
