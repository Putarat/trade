from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_portfolio_cash_balance_holding_current_price'),
    ]

    operations = [
        migrations.CreateModel(
            name='SiteFeature',
            fields=[
                ('key', models.CharField(max_length=100, primary_key=True, serialize=False)),
                ('enabled', models.BooleanField(default=True)),
                ('message', models.TextField(blank=True, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
