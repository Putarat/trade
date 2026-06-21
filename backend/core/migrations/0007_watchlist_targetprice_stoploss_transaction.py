from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_site_feature'),
    ]

    operations = [
        migrations.AddField(
            model_name='userstock',
            name='is_watchlist',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='portfolioholding',
            name='target_price',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=18, null=True),
        ),
        migrations.AddField(
            model_name='portfolioholding',
            name='stop_loss',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=18, null=True),
        ),
        migrations.CreateModel(
            name='HoldingTransaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tx_type', models.CharField(choices=[('buy', 'Buy'), ('sell', 'Sell')], default='buy', max_length=10)),
                ('quantity', models.DecimalField(decimal_places=6, max_digits=18)),
                ('price', models.DecimalField(decimal_places=6, max_digits=18)),
                ('currency', models.CharField(choices=[('THB', 'Thb'), ('USD', 'Usd')], default='THB', max_length=3)),
                ('note', models.TextField(blank=True, null=True)),
                ('tx_date', models.DateField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('holding', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to='core.portfolioholding')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.user')),
            ],
        ),
    ]
