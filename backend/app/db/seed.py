"""
CivicPulse — Database Seed Data Script.

Seeds:
  - 7 Municipal Departments
  - 25 Complaint Categories (mapped to departments with default priorities & keywords)
  - 1 System Admin user (admin@civicpulse.gov / AdminPassword123!)
  - Sample Officers per department (officer.roads@civicpulse.gov, etc.)
"""

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.category import ComplaintCategory
from app.models.department import Department
from app.models.user import User
from app.schemas.enums import ComplaintPriority, UserRole
from app.security.auth import hash_password

DEPARTMENTS_DATA = [
    {
        "name": "Roads & Infrastructure",
        "code": "ROADS",
        "description": "Potholes, street pavement, sidewalk repairs, road hazards",
        "default_sla_hours": 48,
    },
    {
        "name": "Water & Sanitation",
        "code": "WATER",
        "description": "Water leaks, pipe bursts, sewage overflow, low pressure",
        "default_sla_hours": 24,
    },
    {
        "name": "Waste Management",
        "code": "WASTE",
        "description": "Missed garbage collection, illegal dumping, litter bins",
        "default_sla_hours": 24,
    },
    {
        "name": "Public Lighting",
        "code": "LIGHTING",
        "description": "Streetlight outages, exposed wiring, dark intersections",
        "default_sla_hours": 36,
    },
    {
        "name": "Parks & Recreation",
        "code": "PARKS",
        "description": "Fallen tree branches, damaged playground equipment, overgrown grass",
        "default_sla_hours": 72,
    },
    {
        "name": "Public Health & Safety",
        "code": "SAFETY",
        "description": "Stray animals, noise violations, pest control, safety hazards",
        "default_sla_hours": 24,
    },
    {
        "name": "Environmental Services",
        "code": "ENV",
        "description": "Drainage blockages, storm runoff, air quality concerns",
        "default_sla_hours": 48,
    },
]

CATEGORIES_DATA = [
    # Roads
    {"dept_code": "ROADS", "name": "Pothole", "priority": ComplaintPriority.HIGH, "sla": 24, "keywords": ["pothole", "hole", "crater", "asphalt"]},
    {"dept_code": "ROADS", "name": "Damaged Sidewalk", "priority": ComplaintPriority.MEDIUM, "sla": 72, "keywords": ["sidewalk", "pavement", "curb", "walkway"]},
    {"dept_code": "ROADS", "name": "Missing/Damaged Signage", "priority": ComplaintPriority.MEDIUM, "sla": 48, "keywords": ["sign", "stop sign", "traffic sign", "street sign"]},
    {"dept_code": "ROADS", "name": "Speed Bump Issue", "priority": ComplaintPriority.LOW, "sla": 96, "keywords": ["speed bump", "hump", "traffic calming"]},

    # Water
    {"dept_code": "WATER", "name": "Water Main Leak", "priority": ComplaintPriority.CRITICAL, "sla": 12, "keywords": ["water leak", "pipe burst", "gushing water", "leak"]},
    {"dept_code": "WATER", "name": "Sewage Overflow", "priority": ComplaintPriority.CRITICAL, "sla": 12, "keywords": ["sewage", "sewer", "drain overflow", "foul smell"]},
    {"dept_code": "WATER", "name": "No Water Supply", "priority": ComplaintPriority.HIGH, "sla": 24, "keywords": ["no water", "dry tap", "water cut"]},
    {"dept_code": "WATER", "name": "Discolored Water", "priority": ComplaintPriority.HIGH, "sla": 24, "keywords": ["brown water", "dirty water", "tap water"]},

    # Waste
    {"dept_code": "WASTE", "name": "Missed Trash Pickup", "priority": ComplaintPriority.MEDIUM, "sla": 24, "keywords": ["missed pickup", "garbage", "trash bin", "refuse"]},
    {"dept_code": "WASTE", "name": "Illegal Dumping", "priority": ComplaintPriority.HIGH, "sla": 24, "keywords": ["dumping", "debris", "fly tipping", "junk"]},
    {"dept_code": "WASTE", "name": "Overflowing Public Bin", "priority": ComplaintPriority.MEDIUM, "sla": 24, "keywords": ["public bin", "overflowing", "litter bin"]},
    {"dept_code": "WASTE", "name": "Dead Animal Removal", "priority": ComplaintPriority.HIGH, "sla": 12, "keywords": ["dead animal", "carcass", "roadkill"]},

    # Lighting
    {"dept_code": "LIGHTING", "name": "Streetlight Outage", "priority": ComplaintPriority.MEDIUM, "sla": 36, "keywords": ["streetlight", "lamp", "dark street", "light out"]},
    {"dept_code": "LIGHTING", "name": "Exposed Wiring", "priority": ComplaintPriority.CRITICAL, "sla": 12, "keywords": ["wire", "exposed wiring", "electric hazard", "sparks"]},
    {"dept_code": "LIGHTING", "name": "Flickering Streetlight", "priority": ComplaintPriority.LOW, "sla": 72, "keywords": ["flickering", "blinking light"]},

    # Parks
    {"dept_code": "PARKS", "name": "Fallen Tree / Branch", "priority": ComplaintPriority.HIGH, "sla": 24, "keywords": ["tree", "branch", "fallen tree", "blocking road"]},
    {"dept_code": "PARKS", "name": "Damaged Playground Equipment", "priority": ComplaintPriority.HIGH, "sla": 48, "keywords": ["playground", "swing", "slide", "broken park"]},
    {"dept_code": "PARKS", "name": "Overgrown Vegetation", "priority": ComplaintPriority.LOW, "sla": 96, "keywords": ["grass", "weeds", "bushes", "overgrown"]},

    # Safety
    {"dept_code": "SAFETY", "name": "Stray Animal Hazard", "priority": ComplaintPriority.MEDIUM, "sla": 24, "keywords": ["stray dog", "animal control", "bites"]},
    {"dept_code": "SAFETY", "name": "Public Nuisance / Noise", "priority": ComplaintPriority.LOW, "sla": 48, "keywords": ["noise", "loud music", "nuisance"]},
    {"dept_code": "SAFETY", "name": "Hazardous Building / Wall", "priority": ComplaintPriority.HIGH, "sla": 24, "keywords": ["wall collapse", "structural hazard", "dangerous building"]},

    # Environment
    {"dept_code": "ENV", "name": "Blocked Storm Drain", "priority": ComplaintPriority.HIGH, "sla": 24, "keywords": ["drain", "storm drain", "flooding", "clogged drain"]},
    {"dept_code": "ENV", "name": "Air Pollution / Burning", "priority": ComplaintPriority.MEDIUM, "sla": 48, "keywords": ["smoke", "burning", "air quality", "chemical smell"]},
    {"dept_code": "ENV", "name": "Water Pollution", "priority": ComplaintPriority.HIGH, "sla": 24, "keywords": ["river pollution", "chemical waste", "stream"]},
    {"dept_code": "ENV", "name": "General Civic Issue", "priority": ComplaintPriority.LOW, "sla": 72, "keywords": ["general", "other", "civic"]},
]


async def seed_database(db: AsyncSession) -> dict[str, int]:
    """
    Seed database with default departments, categories, admin user, and sample officers.
    Idempotent: skips existing entries.
    """
    counts = {"departments": 0, "categories": 0, "users": 0}

    # 1. Seed Departments
    dept_map: dict[str, Department] = {}
    for d_data in DEPARTMENTS_DATA:
        code_str = str(d_data["code"])
        res = await db.execute(
            select(Department).where(Department.code == code_str)
        )
        existing_dept: Department | None = res.scalar_one_or_none()
        if not existing_dept:
            dept = Department(
                name=str(d_data["name"]),
                code=code_str,
                description=str(d_data["description"]),
                default_sla_hours=int(str(d_data["default_sla_hours"])),
            )
            db.add(dept)
            await db.flush()
            dept_map[code_str] = dept
            counts["departments"] += 1
        else:
            dept_map[code_str] = existing_dept

    # 2. Seed Categories
    for c_data in CATEGORIES_DATA:
        dept_obj = dept_map.get(str(c_data["dept_code"]))
        if not dept_obj:
            continue

        res_cat = await db.execute(
            select(ComplaintCategory).where(
                ComplaintCategory.name == str(c_data["name"])
            )
        )
        if not res_cat.scalar_one_or_none():
            cat = ComplaintCategory(
                name=str(c_data["name"]),
                department_id=dept_obj.id,
                default_priority=c_data["priority"].value if hasattr(c_data["priority"], "value") else str(c_data["priority"]).lower(),
                default_sla_hours=int(str(c_data["sla"])),
                keywords=c_data["keywords"],
            )
            db.add(cat)
            counts["categories"] += 1

    # 3. Seed System Admin User
    admin_email = "admin@civicpulse.gov"
    res = await db.execute(select(User).where(User.email == admin_email))
    if not res.scalar_one_or_none():
        admin_user = User(
            email=admin_email,
            password_hash=hash_password("AdminPassword123!"),
            full_name="System Administrator",
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin_user)
        counts["users"] += 1

    # 4. Seed Sample Officers per Department
    for code, dept in dept_map.items():
        officer_email = f"officer.{code.lower()}@civicpulse.gov"
        res = await db.execute(select(User).where(User.email == officer_email))
        if not res.scalar_one_or_none():
            officer = User(
                email=officer_email,
                password_hash=hash_password("OfficerPassword123!"),
                full_name=f"{dept.name} Officer",
                role=UserRole.MUNICIPAL_OFFICER,
                department_id=dept.id,
                is_active=True,
            )
            db.add(officer)
            counts["users"] += 1

    await db.commit()
    return counts


async def main() -> None:
    async with AsyncSessionLocal() as session:
        counts = await seed_database(session)
        print(f"Database seed complete: {counts}")


if __name__ == "__main__":
    asyncio.run(main())
