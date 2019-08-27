# -*- coding: utf-8 -*-
# Generated by Django 1.10.5 on 2017-07-14 12:45
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("login", "0006_auto_20170713_1503")]

    operations = [
        migrations.AddField(
            model_name="myuser",
            name="groups",
            field=models.ManyToManyField(related_name="members", to="login.UserGroup"),
        )
    ]
