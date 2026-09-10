# Ламинат без порогов между комнатами

Опубликован в Ghost 10 сентября 2026, 04:33:11 UTC. Slug `laminat-bez-porogov-mezhdu-komnatami`, post ID `6aa232e1c4aacd28544c73ae`. Переработанный `article.md` — руководство из 1 202 слов с семью разделами и пятью визуалами; доказательства доставки — `publication-notes.md`.

Самостоятельный intent: возможность непрерывной укладки, переход в дверном проёме, подбор профиля. Не дублирует статьи о направлении, смещении и подложке. В публичном блоге проверены 28 заголовков; отдельной статьи на эту тему не было. Admin API перед созданием вернул `found:false` для выбранного slug. Это не полная инвентаризация всех черновиков под другими адресами.

## Источники, проверенные 10 сентября

- Российский FAQ Quick-Step: геометрия, климат, рекомендация шва между комнатами. https://www.quick-step.ru/faq/laminat/podgotovka-i-ukladka/kakoy-maksimalnoy-dliny-pol-mozhno-ustanavlivat-bez-temperaturnogo-shva/
- Австралийский FAQ Quick-Step: условный допуск без профилей и исключения. https://www.quick-step.com.au/en-au/frequently-asked-questions/laminate/preparation-and-installation/do-i-really-need-expansion-joints-between-every-room
- EGGER: движение покрытия и зазоры у стен. https://support.egger.com/hc/en-us/articles/360001078858-What-is-the-expansion-requirements-for-Laminate-Flooring
- EGGER: переходная, выравнивающая и завершающая функции профилей. https://www.egger.com/en/flooring/accessories/skirtings-profiles?lci=bmM9ZXVzMyAg

Различия региональных FAQ не скрыты. Не назначаются универсальные габариты, зазоры, герметики или крепёж. Нет обещания экономии и гарантий монтажа. Числа из источников не превращены в нормы для всех коллекций. Иллюстрации не выдаются за конструктивные узлы.

## Изображения и финальный промпт

Обложка: встроенный imagegen, без CLI/API fallback. `images/feature.webp`, 1536×1024, quality 85, 190432 байта; исходный результат просмотрен. Caption раскрывает ИИ-происхождение.

Use case: photorealistic-natural. Landscape 1536x1024 editorial cover for renovation article about laminate floor transitions between rooms. Low architectural viewpoint from a warm terracotta hallway through a wide white rectangular doorway into a sunlit sage-green living room. Beautiful natural oak laminate flooring in both rooms with one slim discreet matching oak transition profile clearly crossing the doorway at floor level, not a step. Realistic wood grain and staggered straight boards, floor takes lower half of composition. Afternoon sunlight, inviting saturated natural terracotta and sage accents, crisp magazine quality, tasteful armchair visible in distant room. The transition is an attractive deliberate detail, no broken or swollen flooring. No text, no logos, no people, no watermarks, no rugs covering the doorway. Photorealistic illustrative interior, not a technical installation cutaway.

Внутренние визуалы: авторские схемы `doorway-plan.svg`, `apartment-plan.svg`, `profile-types.svg` (каждая экспортирована в WebP с крупными подписями), а также AI-интерьер `profile-closeup.webp`. План квартиры объясняет вопросы каждого проёма; схема профилей различает покрытия на одном уровне и перепад, но не назначает способ крепления или размер. AI-визуал подписан как иллюстрация, а не монтажный узел.

10 сентября плоские WebP-схемы в публикации заменены на три 3D-иллюстрации imagegen: `doorway-plan-3d.webp`, `apartment-plan-3d.webp`, `profile-types-3d.webp` (WebP quality 86). Общая спецификация: premium realistic 3D architectural visualization, no text/labels/numbers/arrows/logos/watermarks; иллюстрация ситуации, а не технический чертёж. Первая показывает дверной проём, вторая — квартиру с отдельными проёмами, третья — два интерьерных сценария перехода пола.
