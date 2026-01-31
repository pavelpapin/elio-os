# Intercom Opener

Автоматическое открытие домофона через облачный грузинский номер.

## Как работает

```
Домофон звонит → +995 706 070 051 (Zadarma)
  → PBX принимает звонок
  → Webhook получает NOTIFY_START
  → Отвечает: {"ivr_play": "SOUND_ID"}
  → Zadarma проигрывает аудио с DTMF *****
  → Домофон слышит тоны → дверь открывается
```

## Компоненты

| Компонент | Путь |
|-----------|------|
| Webhook-сервер | `projects/intercom-opener/webhook-server.py` |
| DTMF аудио | `projects/intercom-opener/dtmf_stars.wav` |
| Генератор аудио | `projects/intercom-opener/generate-dtmf-audio.sh` |
| Setup-скрипт | `projects/intercom-opener/setup.py` |
| Systemd-сервис | `/etc/systemd/system/intercom-opener.service` |
| Nginx location | `/etc/nginx/sites-enabled/website.conf` → `/zadarma/webhook` |

## Zadarma

| Параметр | Значение |
|----------|----------|
| Номер | +995 706 070 051 |
| PBX ID | 393129 |
| SIP PBX | 941433 |
| Sound ID | 697c9c683612d1a940003890 |
| Webhook URL | https://getelio.co/zadarma/webhook |
| Credentials | `secrets/zadarma-credentials.txt` |

## Управление

```bash
# Статус
systemctl status intercom-opener

# Перезапуск
systemctl restart intercom-opener

# Логи
journalctl -u intercom-opener -f

# Тест webhook
curl -X POST https://getelio.co/zadarma/webhook \
  -d "event=NOTIFY_START&caller_id=test&called_did=995706070051"
```

## Генерация нового DTMF-аудио

Если нужно изменить комбинацию (например, другое количество звёздочек):

```bash
cd projects/intercom-opener
# Отредактировать generate-dtmf-audio.sh (количество тонов, паузы)
bash generate-dtmf-audio.sh
# Загрузить в Zadarma через setup.py
python3 setup.py
```

## Troubleshooting

- **Дверь не открывается**: проверить `journalctl -u intercom-opener` — приходит ли NOTIFY_START
- **Webhook не отвечает**: `curl https://getelio.co/zadarma/webhook` — должен вернуть JSON
- **Номер не работает**: проверить статус в Zadarma → My Numbers (может быть "checking")
- **Паузы не те**: отредактировать TONE_DURATION и GAP_DURATION в generate-dtmf-audio.sh, перегенерить и перезалить
