# -*- coding: utf-8 -*-
# Generated by Django 1.11.24 on 2019-12-16 15:23
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.AddField(
            model_name='tutorial',
            name='media',
            field=models.URLField(null=True),
        ),
    ]
