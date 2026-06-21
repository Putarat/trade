from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_portfolioholding_note'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[('user', 'User'), ('admin', 'Admin')],
                default='user',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='IssueReport',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('subject', models.CharField(max_length=200)),
                ('description', models.TextField()),
                ('status', models.CharField(
                    choices=[('open', 'Open'), ('in_progress', 'In Progress'), ('resolved', 'Resolved')],
                    default='open',
                    max_length=20,
                )),
                ('admin_note', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='issues',
                    to='core.user',
                )),
            ],
        ),
    ]
