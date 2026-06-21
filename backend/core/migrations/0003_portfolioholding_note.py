from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_auto_20260614_2114'),
    ]

    operations = [
        migrations.AddField(
            model_name='portfolioholding',
            name='note',
            field=models.TextField(blank=True, null=True),
        ),
    ]
