from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0001_outboxevent"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProcessedEvent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("event_id", models.CharField(max_length=100)),
                ("consumer_name", models.CharField(max_length=100)),
                ("processed_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "db_table": "processed_events",
                "indexes": [
                    models.Index(
                        fields=["consumer_name", "processed_at"],
                        name="idx_processed_consumer_time",
                    ),
                ],
            },
        ),
        migrations.AddConstraint(
            model_name="processedevent",
            constraint=models.UniqueConstraint(
                fields=("event_id", "consumer_name"),
                name="uq_processed_event_consumer",
            ),
        ),
    ]
