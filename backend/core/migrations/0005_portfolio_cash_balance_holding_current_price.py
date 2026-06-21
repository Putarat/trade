from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_user_role_issue_report'),
    ]

    operations = [
        migrations.AddField(
            model_name='portfolio',
            name='cash_balance',
            field=models.DecimalField(blank=True, decimal_places=2, default=0, max_digits=18, null=True),
        ),
        migrations.AddField(
            model_name='portfolioholding',
            name='current_price',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=18, null=True),
        ),
    ]
