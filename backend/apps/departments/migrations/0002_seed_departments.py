from django.db import migrations


DEPARTMENTS = [
    {
        "name": "Road",
        "slug": "road",
        "description": "Responsible for road construction, maintenance, and repairs.",
    },
    {
        "name": "Water",
        "slug": "water",
        "description": "Manages water supply, pipelines, and quality control.",
    },
    {
        "name": "Electricity",
        "slug": "electricity",
        "description": "Handles power supply, streetlights, and electrical infrastructure.",
    },
    {
        "name": "Garbage",
        "slug": "garbage",
        "description": "Manages waste collection, recycling, and sanitation.",
    },
    {
        "name": "Drainage",
        "slug": "drainage",
        "description": "Oversees storm-water drainage, sewers, and flood prevention.",
    },
]


def seed_departments(apps, schema_editor):
    Department = apps.get_model("departments", "Department")
    for dept_data in DEPARTMENTS:
        Department.objects.get_or_create(
            name=dept_data["name"],
            defaults={
                "slug": dept_data["slug"],
                "description": dept_data["description"],
                "status": "ACTIVE",
            },
        )


def remove_departments(apps, schema_editor):
    Department = apps.get_model("departments", "Department")
    Department.objects.filter(name__in=[d["name"] for d in DEPARTMENTS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("departments", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_departments, remove_departments),
    ]
