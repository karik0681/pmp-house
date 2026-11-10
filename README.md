# PMP House: сайт + демо-кабинет (Angular 22)

## Запуск

```bash
npm install
npm start          # http://localhost:4200
npm test           # тесты конфигуратора (Vitest)
npm run build      # готовый сайт в dist/pmp-house/browser
```

- Сайт: `http://localhost:4200/`
- Кабинет: `http://localhost:4200/admin`, пароль `demo`

## Где что лежит

| Папка | Что внутри |
|---|---|
| `src/app/site/` | главная, шапка с мобильным меню, футер, общий каркас страниц (`layout`), навигация |
| `src/app/references/` | страница «Reference» и страница проекта; **тексты в `refs.data.ts`** |
| `src/app/montage/` | страница «Doprava a montáž»; рисунки в `drawings.ts` |
| `src/app/configurator/` | 6 шагов конфигуратора; `model.ts` содержит правила и расчёты, `data.ts` цены, размеры и фото |
| `src/app/three/stage.ts` | 3D-сцена (Three.js) |
| `src/app/leads/` | заявки: модель, сервис (localStorage), отправка формы |
| `src/app/admin/` | вход, доска заявок, карточка клиента |
| `src/app/core/` | переводы CZ/DE, настройки, источник рекламы (utm) |

## Настройки: `src/app/core/settings.ts`

- `languages: ['cs']` — сайт только на чешском. Немецкие тексты сохранены: если написать `['cs', 'de']`, вернётся переключатель CZ/DE.

- `formKey`: ключ Web3Forms (бесплатно на web3forms.com). Пока он пустой, заявка не уходит на почту.
- `mail`, `phone`, `whatsapp`, `address`, `hours`, `ico`, `dic`: контакты и реквизиты для футера.
- `social`: ссылки на Facebook, Instagram, TikTok, YouTube. Пустая ссылка = серая иконка.
- `demoCrm: true` сохраняет заявки в демо-кабинет. Для боевого сайта без CRM поставьте `false`.

## Пререндер (для Google)

- `npm run build` заранее собирает каждую публичную страницу в готовый HTML с текстом: главную, `/reference`, каждую референцию, `/montaz`, `/ochrana-udaju`. Список страниц — в `src/app/app.routes.server.ts`.
- Кабинет `/admin` не пререндерится: после сборки `scripts/postbuild.mjs` кладёт туда пустую оболочку приложения (она же `404.html`).
- Код, которому нужен браузер (`window`, `localStorage`, 3D), должен запускаться в `afterNextRender` или за проверкой `typeof window !== 'undefined'`, иначе сборка упадёт.
- Заголовок и описание каждой страницы задаёт `SeoService` (`src/app/core/seo.service.ts`).

## Тексты страниц

- Переводы CZ/DE: `src/app/core/i18n.ts` (главная, конфигуратор) и `src/app/core/i18n-pages.ts` (футер, Reference, монтаж).
- Reference: в `refs.data.ts` описания, годы, размеры и дополнительные фото — **ПРИМЕРЫ**. Замените на реальные и поставьте `demo: false`, тогда жёлтая плашка «Ukázkový popis» исчезнет.
- Страница «Ochrana osobních údajů» — тоже пример, текст должна дать фирма.

## Важно: это демо

- Пароль `demo` проверяется в браузере. Это не защита.
- Заявки хранятся в localStorage, то есть только в этом браузере на этом компьютере.
- Для настоящего кабинета нужны сервер и база данных (например, Supabase), а также нормальный вход.

## Публикация

В `src/index.html` стоит `<meta name="robots" content="noindex">`: пока тексты демо, Google сайт не индексирует. **При запуске эту строку удалить.**

### GitHub → Cloudflare Pages / Vercel

- Build command: `npm run build`
- Output directory: `dist/pmp-house/browser`
- Cloudflare Pages бесплатно разрешает коммерческие сайты. Бесплатный Vercel Hobby для бизнеса не подходит.
