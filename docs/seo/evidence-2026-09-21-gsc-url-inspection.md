# GSC URL Inspection: 9 калькуляторов и 5 статей

Дата проверки: **21 сентября 2026**. Источник: Google Search Console, свойство `https://getmasterok.ru/`. Проверялись сохранённые данные Google Index после успешной отправки `/sitemap-pages.xml`.

## Результат

Все 14 адресов имеют одинаковый основной статус: **URL is not on Google → Crawled - currently not indexed**. В сохранённых данных Google обход разрешён, загрузка успешна, индексация разрешена. Последние обходы старые — от 26 мая до 8 июля 2026 года.

| URL | Последний обход Google | Источник обнаружения в карточке |
|---|---:|---|
| `/kalkulyatory/potolki/reechnyj-potolok/` | 08.07.2026 07:31 | `sitemap-pages.xml` |
| `/kalkulyatory/steny/gipsokarton/` | 07.07.2026 09:39 | `sitemap-pages.xml` |
| `/kalkulyatory/inzhenernye/otoplenie-radiatory/` | 06.07.2026 23:12 | `sitemap-pages.xml` |
| `/kalkulyatory/fasad/uteplenie/` | 05.07.2026 14:33 | `sitemap-pages.xml` |
| `/kalkulyatory/otdelka/kraska/` | 05.07.2026 09:53 | `sitemap-pages.xml` |
| `/kalkulyatory/fundament/plitnyj-fundament/` | 05.07.2026 08:18 | `sitemap-pages.xml` |
| `/kalkulyatory/inzhenernye/teplyy-pol/` | 24.06.2026 18:12 | временная ошибка обработки |
| `/kalkulyatory/potolki/uteplenie-potolka/` | 22.06.2026 05:48 | `sitemap-pages.xml` |
| `/kalkulyatory/steny/gazobeton/` | 26.05.2026 18:03 | временная ошибка обработки |
| `/blog/kak-rasschitat-laminat-na-komnatu/` | 07.07.2026 05:24 | временная ошибка обработки |
| `/blog/rashod-kraski-na-m2-steny/` | 07.07.2026 04:13 | `sitemap-pages.xml` |
| `/blog/elektrika-v-kvartire/` | 30.05.2026 00:55 | `sitemap-pages.xml` |
| `/blog/raschet-fundamenta/` | 26.05.2026 17:42 | `sitemap-pages.xml` |
| `/blog/vybor-styazhki-pola/` | 26.05.2026 15:26 | временная ошибка обработки |

`Временная ошибка обработки` появилась в поле Sitemaps у четырёх отдельных карточек сразу после отправки новой карты. Сама карта в общем отчёте уже имеет `Success` и 151 обнаруженную страницу. Это состояние нужно перепроверить после обработки Search Console; оно не доказывает дефект текущего XML.

## Что изменилось относительно старого обхода

В старых сохранённых данных карточки показывают `User-declared canonical: None`. Текущий production HTML этих страниц отдаёт self-canonical, HTTP 200 и разрешает индексацию; страницы входят в принятую плоскую карту. Поэтому отсутствие canonical в старой карточке нельзя переносить на нынешнюю реализацию.

Технический блокер discovery закрыт. Следующая инженерная правка — обеспечить целевым инструментам постоянные контекстные входящие ссылки в серверном HTML, а не только переходы, которые возникают после работы клиентской формы. Факт индексации проверяется отдельно после нового обхода; отправка sitemap и изменение ссылок не являются гарантией попадания в индекс.
