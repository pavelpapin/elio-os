# Website Builder — Архитектурный план

## Суть
Добавить в Elio OS возможность хостить и быстро править сайт (one-pager лендинг).
Всё на существующем VPS, рядом с остальной инфрой.

## Стек
- **Next.js 14** (App Router, static export)
- **Tailwind CSS** — дизайн
- **nginx** — reverse proxy + SSL
- **Let's Encrypt (certbot)** — бесплатный SSL
- **Деплой** — `pnpm build` → static files → nginx serves them

## Почему static export (не SSR)
- Не нужен отдельный Node.js процесс для сайта
- nginx отдаёт HTML/CSS/JS — максимально быстро и надёжно
- Меньше нагрузки на VPS (и так загружен Elio)
- Для one-pager SSR не нужен

## Где живёт код
```
/root/.claude/
├── website/                    # ← НОВОЕ
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx      # Root layout
│   │   │   ├── page.tsx        # Главная (лендинг)
│   │   │   └── globals.css     # Tailwind styles
│   │   └── components/         # UI компоненты
│   │       ├── hero.tsx
│   │       ├── features.tsx
│   │       ├── cta.tsx
│   │       └── footer.tsx
│   ├── public/                 # Статика (favicon, images)
│   ├── out/                    # Build output (static HTML)
│   ├── next.config.js          # output: 'export'
│   ├── tailwind.config.ts
│   ├── package.json
│   └── tsconfig.json
```

## Инфраструктура (что настроить)

### 1. nginx (reverse proxy)
```
/etc/nginx/sites-available/website.conf
```
- Проксирует домен → `/root/.claude/website/out/`
- SSL через certbot
- Gzip, cache headers

### 2. SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 3. Deploy script
```
/root/.claude/scripts/deploy-website.sh
```
```bash
cd /root/.claude/website
pnpm build
# nginx уже указывает на out/ — готово
```

### 4. Skill для деплоя
```
/root/.claude/skills/deploy-website/
├── SKILL.md
└── run.sh
```

## Как я буду работать с сайтом

### Правки контента
Ты говоришь: "Поменяй заголовок на X"
Я: Edit `website/src/app/page.tsx` → run deploy script → готово

### Правки дизайна
Ты говоришь: "Сделай секцию шире"
Я: Edit компонент → rebuild → готово

### Добавить страницу
Создаю `website/src/app/about/page.tsx` → rebuild → готово

## Что тебе нужно сделать (вручную)

1. **DNS**: Направить домен (A-запись) на IP твоего VPS
2. **Сказать мне домен** — я настрою nginx и SSL
3. **Рассказать что за продукт** — я соберу лендинг

## Что я сделаю

1. Инициализирую Next.js проект в `website/`
2. Настрою static export + Tailwind
3. Установлю nginx + настрою конфиг
4. Установлю certbot + получу SSL (после DNS)
5. Создам deploy script + skill
6. Соберу лендинг по твоему брифу

## Верификация
- `curl https://yourdomain.com` возвращает HTML
- Lighthouse score > 90
- Правка текста + deploy < 1 минуты
