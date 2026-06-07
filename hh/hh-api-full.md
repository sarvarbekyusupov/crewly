# HH.ru (HeadHunter) — To'liq API Dokumentatsiyasi

> Manba: https://github.com/hhru/api | Yuklab olingan: 2026-06-07

---

# ASOSIY README

# HeadHunter API

**По-русски** | [In english]([docs_eng/README.md]([https://api.hh.ru/openapi/redoc](https://api.hh.ru/openapi/en/redoc)))

HeadHunter API — это инструментарий для интеграции
[HeadHunter](http://hh.ru/) в ваш продукт.

Для начала ознакомьтесь с [общей информацией](https://api.hh.ru/openapi/redoc#section/Obshaya-informaciya) по работе API,
[часто задаваемыми вопросами](docs/FAQ.md) и
с требованиями к [использованию логотипов](https://hh.ru/article/brandmaterials) и
[названию приложений](https://dev.hh.ru/articles/apps).

Для использования методов, требующих авторизацию пользователя или приложения, вам необходимо
зарегистрировать приложение по адресу [https://dev.hh.ru](https://dev.hh.ru)
и настроить процесс [авторизации](docs/authorization.md).

Зарегистрированное приложение может запрашивать у пользователей hh.ru
разрешение доступа к их персональным данным, без получения и хранения их
логина и пароля.


> ‼️ Обратите внимание, что методы для работы с сообщениями в рамках отклика/приглашения от имени 
> [менеджера работодателя](docs/employer_negotiations.md#get-messages) устарели, и новые возможности [чатов](https://feedback.hh.ru/knowledge-base/article/1290) в них не будут поддерживаться. 
> В связи с этим переписка может некорректно отображаться. 

## [OpenAPI](https://api.hh.ru/openapi/redoc)

Доступная в [OpenAPI](https://api.hh.ru/openapi/redoc) документация будет со временем дополняться.
Методы, описанные в данной документации и доступные в OpenAPI, имеют соответствующую ссылку.

Спецификация HeadHunter API: [openapi.yml](https://api.hh.ru/openapi/specification/public).

<a name="content"></a>
## Содержание

Пометки в документации:

* <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> –
  актуально для анонимных запросов, не требует авторизации.
* <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> – актуально для запросов от имени приложения, требует [авторизацию приложения](docs/authorization_for_application.md)
* <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> –
  актуально для запросов от имени соискателя, требует [авторизацию пользователя](docs/authorization_for_user.md).
* <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" /> –
  актуально для методов работодателя, требует  [авторизацию пользователя](docs/authorization_for_user.md).


<a name="general"></a>
### Общая информация

* [Общая информация](https://api.hh.ru/openapi/redoc#section/Obshaya-informaciya) 
* [Условия использования сервиса API](https://dev.hh.ru/admin/developer_agreement) 
* [Требования к использованию логотипов]([https://dev.hh.ru/articles/logos](https://hh.ru/article/brandmaterials)) 
* [Требования к названию приложений](https://dev.hh.ru/articles/apps) 
* [Авторизация](docs/authorization.md) 
* [Кэширование](docs/cache.md) 
* [Ошибки и коды ответов](docs/errors.md) 
* [Новая модель работы с базой резюме (поддержка в API)](docs/payable/resume.md) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />

<a name="resources"></a>
<a name="context"></a>
### Контекст

* Информация об авторизованном пользователе или приложении <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * Получение информации об авторизованном пользователе:
    * [Соискатель](https://api.hh.ru/openapi/redoc#tag/Informaciya-o-soiskatele/operation/get-current-user-info)
    * [Работодатель](https://api.hh.ru/openapi/redoc#tag/Informaciya-o-menedzhere/operation/get-current-user-info)
  * [Редактирование информации авторизованного пользователя](https://api.hh.ru/openapi/redoc#tag/Informaciya-o-soiskatele/operation/edit-current-user-info)
  * [Получение информации об авторизованном приложении](https://api.hh.ru/openapi/redoc#tag/Informaciya-o-prilozhenii/operation/get-current-user-info)
* Информация о менеджере
  * [Рабочие аккаунты менеджера](https://api.hh.ru/openapi/redoc#tag/Menedzhery-rabotodatelya/operation/get-manager-accounts) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Предпочтения менеджера](https://api.hh.ru/openapi/redoc#tag/Menedzhery-rabotodatelya/operation/get-manager-settings) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Информация по активным услугам API для платных методов](https://api.hh.ru/openapi/redoc#tag/Uslugi-rabotodatelya/operation/get-payable-api-actions) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Локализация](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-locales) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Локализация для резюме](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-locales-for-resume) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Выбор сайта](https://api.hh.ru/openapi/redoc#section/Obshaya-informaciya/Vybor-sajta) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />

<a name="webhook"></a>
### [Webhook API](https://api.hh.ru/openapi/redoc#tag/Webhook-API)

* [Список уведомлений, на которые подписан пользователь](https://api.hh.ru/openapi/redoc#tag/Webhook-API/operation/get-webhook-subscriptions) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Подписка на уведомления](https://api.hh.ru/openapi/redoc#tag/Webhook-API/operation/post-webhook-subscription) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Удаление подписки](https://api.hh.ru/openapi/redoc#tag/Webhook-API/operation/cancel-webhook-subscription) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Изменение подписки](https://api.hh.ru/openapi/redoc#tag/Webhook-API/operation/change-webhook-subscription) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />

<a name="resume"></a>
### Резюме

* [Поиск резюме](https://api.hh.ru/openapi/redoc#tag/Poisk-rezyume/operation/search-for-resumes) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Сохраненные поиски резюме](https://api.hh.ru/openapi/redoc#tag/Sohranennye-poiski-rezyume) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Список сохраненных поисков резюме](https://api.hh.ru/openapi/redoc#tag/Sohranennye-poiski-rezyume/operation/get-saved-resume-searches) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Получение единичного сохраненного поиска резюме](https://api.hh.ru/openapi/redoc#tag/Sohranennye-poiski-rezyume/operation/get-saved-resume-search) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Создание нового сохраненного поиска резюме](https://api.hh.ru/openapi/redoc#tag/Sohranennye-poiski-rezyume/operation/create-saved-resume-search) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Обновление сохраненного поиска резюме](https://api.hh.ru/openapi/redoc#tag/Sohranennye-poiski-rezyume/operation/update-saved-resume-search) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Удаление сохраненного поиска резюме](https://api.hh.ru/openapi/redoc#tag/Sohranennye-poiski-rezyume/operation/delete-saved-resume-search) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Передача сохраненного поиска резюме другому менеджеру](https://api.hh.ru/openapi/redoc#tag/Sohranennye-poiski-rezyume/operation/move-saved-resume-search) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Просмотр резюме](https://api.hh.ru/openapi/redoc#tag/Prosmotr-rezyume/operation/get-resume) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [История откликов/приглашений по резюме](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/get-resume-negotiations-history) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />

<a name="vacancies"></a>
### Вакансии

* [Получение вакансий](docs/vacancies.md) <img src="http://hhru.github.io/api/badges/client.png" alt="client" />  <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Поиск по вакансиям](https://api.hh.ru/openapi/redoc#tag/Poisk-vakansij/operation/get-vacancies) <img src="http://hhru.github.io/api/badges/client.png" alt="client" />  <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
    * [Кластеры](https://api.hh.ru/openapi/redoc#tag/Poisk-vakansij/Klastery-v-poiske-vakansij) <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Получение информации о вакансии](docs/vacancies.md#item) <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Поиск по вакансиям, похожим на вакансию](https://api.hh.ru/openapi/redoc#tag/Poisk-vakansij/operation/get-vacancies-similar-to-vacancy) <img src="http://hhru.github.io/api/badges/client.png" alt="client" />  <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Работа с вакансиями](docs/employer_vacancies.md) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Возможные варианты публикации вакансий](docs/employer_vacancies.md#available_types) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Публикация вакансий](docs/employer_vacancies.md#creation) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Редактирование вакансий](docs/employer_vacancies.md#edit) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Продление вакансий](docs/employer_vacancies.md#prolongate) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Список опубликованных вакансий](docs/employer_vacancies.md#active) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Архивация вакансий](docs/employer_vacancies.md#archive) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Список архивных вакансий](docs/employer_vacancies.md#archived) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Удаление вакансий](docs/employer_vacancies.md#hide) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Список удаленных вакансий](docs/employer_vacancies.md#hidden) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Список улучшений для вакансии](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/get-vacancy-upgrade-list) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Статистика по вакансии](docs/employer_vacancies.md#stats) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Просмотры вакансии](docs/employer_vacancies.md#visitors) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Черновики вакансий](https://api.hh.ru/openapi/redoc#tag/Chernoviki-vakansij) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Получение списка черновиков](https://api.hh.ru/openapi/redoc#tag/Chernoviki-vakansij/operation/get-vacancy-draft-list) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Удаление черновика](https://api.hh.ru/openapi/redoc#tag/Chernoviki-vakansij/operation/delete-vacancy-draft) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Создание черновика](https://api.hh.ru/openapi/redoc#tag/Chernoviki-vakansij/operation/create-vacancy-draft) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Публикация вакансий на основе черновика](https://api.hh.ru/openapi/redoc#tag/Chernoviki-vakansij/operation/publish-vacancy-from-draft) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Получение черновика](https://api.hh.ru/openapi/redoc#tag/Chernoviki-vakansij/operation/get-vacancy-draft) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Изменение черновика](https://api.hh.ru/openapi/redoc#tag/Chernoviki-vakansij/operation/change-vacancy-draft) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />

<a name="applicants"></a>
### Соискатели

* [Комментарии к соискателю](https://api.hh.ru/openapi/redoc#tag/Kommentarii-k-soiskatelyu) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Авторизация соискателя](https://api.hh.ru/openapi/redoc#tag/Avtorizaciya-soiskatelya) <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" />

<a name="employers"></a>
### Работодатели/компании

* [Поиск компаний](https://api.hh.ru/openapi/redoc#tag/Rabotodatel/operation/search-employer) <img src="http://hhru.github.io/api/badges/client.png" alt="client" />  <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Получение информации о компании](https://api.hh.ru/openapi/redoc#tag/Rabotodatel/operation/get-employer-info) <img src="http://hhru.github.io/api/badges/client.png" alt="client" />  <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Услуги работодателя](https://api.hh.ru/openapi/redoc#tag/Uslugi-rabotodatelya) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Авторизация работодателя](https://api.hh.ru/openapi/redoc#tag/Avtorizaciya-rabotodatelya) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Менеджеры работодателя](https://api.hh.ru/openapi/redoc#tag/Menedzhery-rabotodatelya) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />

<a name="employer_managers"></a>
### Менеджеры работодателя

* [Менеджеры](docs/employer_managers.md) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Добавление менеджера](docs/employer_managers.md#add) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Редактирование менеджера](docs/employer_managers.md#edit) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Удаление менеджера](docs/employer_managers.md#delete) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Справочник менеджеров работодателя](docs/employer_managers.md#list) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Получение информации о менеджере](docs/employer_managers.md#item) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Дневной лимит просмотра резюме для текущего менеджера](https://api.hh.ru/openapi/redoc#tag/Menedzhery-rabotodatelya/operation/get-employer-manager-limits) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />

<a name="negotiations"></a>
### Переписка (отклики/приглашения)

* [Переписка для работодателя](docs/employer_negotiations.md) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Модель работы, термины и процедуры](docs/employer_negotiations.md#model) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Общее описание процесса работы с откликами/приглашениями](docs/employer_negotiations.md#flow) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Коллекции и работодательские состояния откликов/приглашений](docs/employer_negotiations.md#collections) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Список откликов/приглашений](docs/employer_negotiations.md#negotiations-list) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Просмотр отклика/приглашения](docs/employer_negotiations.md#get-negotiation) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Работа с сообщениями по отклику/приглашению для работодателя](docs/employer_negotiations.md#get-messages) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Приглашение соискателя на вакансию](docs/employer_negotiations.md#add-invite) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Действия по отклику/приглашению (смена состояния)](docs/employer_negotiations.md#actions) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Отметить отклики прочитанными](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/post-negotiations-topics-read) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Статистика по работе с откликами](docs/employer_negotiations_statistics.md) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Тексты сообщений](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/get-negotiation-message-templates) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Изменение шаблона ответа соискателю](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/put-mail-templates-item) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Инструменты оценки](docs/assessment.md) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />


<a name="dictionaries"></a>
### Справочники
* [Справочники в OpenAPI](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Регионы](docs/areas.md) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Профессиональные роли](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-professional-roles-dictionary) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Станции метро в указанном городе](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-metro-stations-in-city) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" />  <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Станции метро во всех городах](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-metro-stations) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Языки](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-languages) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Отрасли компаний](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-industries) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Учебные заведения](docs/educational_institutions.md) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Основная информация об учебных заведениях](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-educational-institutions-dictionary) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Факультеты учебных заведений](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-educational-institutions-dictionary) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" />  <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Справочники работодателя](docs/employer_dictionaries.md) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Адреса](https://api.hh.ru/openapi/redoc#tag/Adresa-rabotodatelya) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Типы и права менеджера](docs/employer_managers.md#dict) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Менеджеры работодателя](docs/employer_managers.md#list) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Департаменты](https://api.hh.ru/openapi/redoc#tag/Informaciya-o-rabotodatele/operation/get-employer-departments) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Тесты](https://api.hh.ru/openapi/redoc#tag/Spravochniki-rabotodatelya/operation/get-tests-dictionary) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Регионы вакансий](https://api.hh.ru/openapi/redoc#tag/Informaciya-o-rabotodatele/operation/get-employer-vacancy-areas) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Брендированные шаблоны вакансий](https://api.hh.ru/openapi/redoc#tag/Informaciya-o-rabotodatele/operation/get-vacancy-branded-templates-list) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Ключевые навыки](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-skills) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Прочие справочники](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-dictionaries) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />


<a name="suggests"></a>
### Подсказки (autosuggest, autocomplete)
* [Подсказки в OpenAPI](https://api.hh.ru/openapi/redoc#tag/Podskazki) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Подсказки](docs/suggests.md) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [по названиям университетов](docs/suggests.md#educational_institutions) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [по организациям](docs/suggests.md#companies) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [по специализациям](docs/suggests.md#specializations) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [по ключевым навыкам](docs/suggests.md#key-skills) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [по должностям резюме](docs/suggests.md#resume-positions) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [по регионам](docs/suggests.md#areas) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/app.png" alt="applicant" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [по ключевым словам поиска вакансий](docs/suggests.md#vacancy-search-keyword) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />


<a name="salary"></a>
### Банк данных заработных плат

* [Отчёты Банка данных заработных плат](https://api.hh.ru/openapi/redoc#tag/Bank-dannyh-o-zarplatah) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Оценка заработной платы без прогнозов](https://api.hh.ru/openapi/redoc#tag/Bank-dannyh-o-zarplatah/operation/get-salary-evaluation) <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
* [Справочники Банка данных заработных плат](https://api.hh.ru/openapi/redoc#tag/Spravochniki-Banka-dannyh-zarabotnyh-plat) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" /> <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Отрасли](https://api.hh.ru/openapi/redoc#tag/Spravochniki-Banka-dannyh-zarabotnyh-plat/operation/get-salary-industries) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" />  <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Уровни специалистов](https://api.hh.ru/openapi/redoc#tag/Spravochniki-Banka-dannyh-zarabotnyh-plat/operation/get-salary-employee-levels) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" />  <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Профобласти и специализации](https://api.hh.ru/openapi/redoc#tag/Spravochniki-Banka-dannyh-zarabotnyh-plat/operation/get-salary-professional-areas) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" />  <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />
  * [Регионы и города](https://api.hh.ru/openapi/redoc#tag/Spravochniki-Banka-dannyh-zarabotnyh-plat/operation/get-salary-salary-areas) <img src="http://hhru.github.io/api/badges/anon.png" alt="anonymous" /> <img src="http://hhru.github.io/api/badges/client.png" alt="client" />  <img src="http://hhru.github.io/api/badges/emp.png" alt="employer" />


<a name="feedback"></a>
## Поддержка, обратная связь, новости

Общайтесь с нами через почту api@hh.ru.

Если вы нашли проблему на одном из сайтов HeadHunter,
[напишите в поддержку по сайту](https://hh.ru/feedback) или в
[сообщество поддержки](https://feedback.hh.ru/).



---

# FAQ

# FAQ
Информация актуальна на момент написания, но через какое-то время может устареть.

<a name="speed_request"></a>
<details><summary><strong>Как долго будет обрабатываться заявка на приложение?</strong></summary>

Заявка на создание приложения должна пройти проверку нескольких отделов, 
этот процесс может занимать до 15 рабочих дней (это явно указано на форме регистрации). 
Мы можем предоставить информацию о статусе заявки, но не влиять на скорость/обсуждение/результат.
</details>

<a name="invitation_from_negotiation"></a>
<details><summary><strong>Как пригласить соискателя на собеседование?</strong></summary>

### Вариант 1. Соискатель уже откликнулся на вашу вакансию
1. Для приглашения соискателя на собеседование необходимо получить список [коллекций и работодательских состояний откликов/приглашений по вакансии](employer_negotiations.md#collections):

```
GET /negotiations?vacancy_id={vacancy_id}
```
где vacancy_id - id вакансии, для которой есть отклики

#### Ответ

```json
{
    "collections": [
        {
            "id": "response",
            "name": "Неразобранные",
            "description": "Описание коллекции",
            "url": "https://api.hh.ru/negotiations/response?vacancy_id=123456",
             ...
        }
         ...
    ]
     ...
}
```
2. Затем нужно сделать `GET` запрос по урлу, из поля `colletions[].url` из нужной коллекции.

в данном примере:
```
GET /negotiations/response?vacancy_id=123456
```
В ответ вернутся действия (`actions`), которые можно совершить с откликом (в примере: из коллекции response).
#### Ответ

```json
{
    "actions": [
        {
            "id": "interview",
            "enabled": true,
            "method": "PUT",
            "url": "https://api.hh.ru/negotiations/interview/123456789",
            "arguments": [
                        {
                            "id": "message",
                            "required": true,
                            "required_arguments": []
                        }
                        ...
            ]
            ...
        }
         ...
    ]
     ...
}
```
3. Для совершения действия по отклику/приглашению необходимо выполнить запрос из списка `actions`, передав аргументы, содержащиеся в поле `arguments`.

в данном примере:
```
PUT /negotiations/interview/123456789?message=new_msg
```

Таким образом, пользователь получит сообщение в ответ на свой отклик и будет приглашен на интервью.

### Вариант 2. Приглашение соискателя, который не откликнулся на вакансию
1. Для создания приглашения необходимо запросить вакансии работодателя, применимые к выбранному резюме.
Получить эту информацию можно в [списке вакансий работодателя](https://api.hh.ru/openapi/redoc#tag/Vakansii/operation/get-active-vacancy-list):
```
GET /employers/{employer_id}/vacancies/active?resume_id={resume_id}
```
#### Ответ

```json
{
    "items": [
        {
            "negotiations_actions": [
                {
                    "id": "phone_interview",
                    "name": "Телефонное интервью",
                    "enabled": true,
                    "method": "POST",
                    "url": "https://api.hh.ru/negotiations/phone_interview",
                    "arguments": [
                        {
                            "id": "resume_id",
                            "required": true,
                            "required_arguments": []
                        },
                        {
                            "id": "vacancy_id",
                            "required": true,
                            "required_arguments": []
                        },
                        {
                            "id": "message",
                            "required": true,
                            "required_arguments": []
                        }
                        ...
                    ]
                    ...
                }
            ]
             ...
        }
    ]
     ...
}
```
2. Выбрать действие, которое необходимо осуществить (`negotiations_actions`), и выполнить его, послав запрос и передав аргументы, содержащиеся в поле `arguments`

в данном примере:
```
POST /negotiations/phone_interview?resume_id=123456&vacancy_id=654321&message=new_msg
```

Таким образом, соискатель получит сообщение и будет приглашен на телефонное интервью.

Аналогично можно выполнить любые доступные для работодателя действия с откликом.
</details>


---

# README

Перейти к [оглавлению](../README.md#headhunter-api).


---

# ADDRESS

# Адрес

Поле адрес используется в различных ответах API, например, в резюме, откликах,
при просмотре вакансии. Может содержать в себе долготу, широту, информацию о
ближайших станциях метро и другую информацию о местонахождении. Выглядит
следующим образом:

```json
{
    "city": "Москва",
    "street": "улица Годовикова",
    "building": "9с10",
    "description": "на проходной потребуется паспорт",
    "lat": 55.807794,
    "lng": 37.638699,
    "metro_stations": [
        {
            "station_id": "6.8",
            "station_name": "Алексеевская",
            "line_id": "6",
            "line_name": "Калужско-Рижская",
            "lat": 55.807794,
            "lng": 37.638699
        }
    ]
}
```

Имя | Тип | Описание
---- | --- | --------
city | string или null | Город
street | string или null | Улица
building | string или null | Номер дома
description | string или null | Дополнительная информация об адресе
lat | number или null | Географическая широта
lng | number или null | Географическая долгота
metro_stations | array | Список станций метро, может быть пустым
metro_stations[].station_id | string | Идентификатор станции метро
metro_stations[].station_name | string | Название станции метро
metro_stations[].line_id | string | Идентификатор линии метро, на которой находится станция
metro_stations[].line_name | string | Название линии метро, на которой находится станция
metro_stations[].lat | number или null | Географическая широта станции метро
metro_stations[].lng | number или null | Географическая долгота станции метро




---

# AREAS

# Справочник регионов

> ‼️ Внимание! Значения в справочниках могут поменяться в любой момент. Не нужно завязываться на них.

* [Дерево всех регионов](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-areas)
* [Справочник регионов, начиная с указанного](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-areas-from-specified)
* [Справочник стран](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-countries)

### Смотрите также

* [Подсказки по полному дереву регионов и листам дерева регионов](suggests.md#areas)


---

# ASSESSMENT

# Инструменты оценки

> <img src="http://hhru.github.io/api/badges/emp_paid.png" alt="employer with paid access" /> : Для работодателя работа с инструментами оценки требует [наличия платного доступа](https://api.hh.ru/openapi/redoc#tag/Uslugi-rabotodatelya/operation/get-payable-api-method-access)

Инструменты оценки – это тесты или опросники, предназначеные для
прохождения соискателями.

Информация о них может присутствовать в сообщениях, направляемых
[работодателем](employer_negotiations.md#get-messages)
[соискателю](negotiations.md#get_messages) в рамках откликов/приглашений.


Объект выглядит следующим образом:

```json
{
    "id": "123",
    "name": "Динамический тест числовых способностей",
    "actions": [
        {
            "id": "proceed",
            "name": "Перейти к тестированию",
            "enabled": true,
            "alternate_url": "https://hh.ru/applicant/assessment/123"
        }
    ]
}
```

где:

 Имя | Тип | Описание
 --- | --- | ---
 id | строка | Уникальный идентификатор инструмента
 name | строка | Название инструмента
 actions | массив | Массив возможных [действий над инструментом](#actions)


<a name="actions"></a>
## Действие над инструментом

В зависимости от состояния инструмента оценки, конкретные действия над ним могут
быть доступны либо нет.

Пример доступного действия:

```json
{
    "id": "proceed",
    "name": "Перейти к тестированию",
    "enabled": true,
    "alternate_url": "https://hh.ru/applicant/assessment/123"
}
```

Пример недоступного действия:

```json
{
    "id": "proceed",
    "name": "Перейти к тестированию",
    "enabled": false,
    "disable_reason": "Тестирование завершено"
}
```


где:

 Имя | Тип | Описание
 --- | --- | ---
 id | строка | Тип действия
 name | строка | Описание действия
 enabled | boolean | Доступно ли действие
 alternate_url | строка | Ссылка на сайт, переход по которой инициирует действие
 disable_reason | строка | Пояснение, почему действие недоступно


---

# AUTHORIZATION

# Авторизация

Для выполнения большинства запросов к API необходимо передавать access-токен.
Авторизация осуществляется по протоколу [OAuth 2.0](#links).

Зарегистрированное приложение может запрашивать у пользователей hh.ru
разрешение доступа к их персональным данным, без получения и хранения их
логина и пароля.

API поддерживает следующие уровни авторизации:
* [авторизация приложения](authorization_for_application.md)
* [авторизация пользователя](authorization_for_user.md)

> Внимание! Для авторизации нужно использовать домен hh.ru, домен m.hh.ru больше не доступен.

* [Получение access-токена](#get-access_token)
* [Использование access-токена](#use-access_token)
* [Проверка access-токена](#check-access_token)
* [Полезные ссылки](#links)

<a name="get-access_token"></a>
## Получение access-токена

* Получение [токена приложения](authorization_for_application.md#get-client-auth)
* Получение [токена пользователя](authorization_for_user.md#get-auth)

<a name="use-access_token"></a>
## Использование access-токена

Приложение должно использовать полученный `access_token` для авторизации,
передавая его в заголовке в формате:

```Authorization: Bearer ACCESS_TOKEN```

[Описание ошибок авторизации](errors.md#oauth).

<a name="check-access_token"></a>
## Проверка access-токена

Для тестирования токена удобно использовать метод `/me`:

* [для авторизованного приложения](https://api.hh.ru/openapi/redoc#tag/Informaciya-o-prilozhenii/operation/get-current-user-info)
* [для авторизованного менеджера работодателя](https://api.hh.ru/openapi/redoc#tag/Informaciya-o-menedzhere/operation/get-current-user-info)
* [для авторизованного соискателя](https://api.hh.ru/openapi/redoc#tag/Informaciya-o-soiskatele/operation/get-current-user-info)

<a name="links"></a>
## Полезные ссылки

* Подробная документация по протоколу: [RFC 6749](http://tools.ietf.org/html/rfc6749)
* Библиотека [ScribeJava](https://github.com/scribejava/scribejava),
  поддерживающая авторизацию в API HeadHunter.
  * [Habrahabr: ScribeJava — даже ваша бабушка сможет работать с OAuth](https://habrahabr.ru/company/hh/blog/278957/)

---

# AUTHORIZATION FOR APPLICATION

# Авторизация приложения

Токен приложения необходимо сгенерировать 1 раз.
В случае, если токен был скомпрометирован, его нужно запросить еще раз. При этом ранее выданный токен отзывается.
Владелец приложения может посмотреть актуальный `access_token` для приложения на сайте [https://dev.hh.ru/admin](https://dev.hh.ru/admin). В случае, если вы еще ни разу [не получали токен приложения](https://api.hh.ru/openapi/redoc#tag/Avtorizaciya-prilozheniya), токен отображаться не будет.

<a name="get-client-auth"></a>
## Получение токена приложения
> > !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Avtorizaciya-prilozheniya)

---

# AUTHORIZATION FOR USER

<a name="get-auth"></a>
<a name="redirect_uri"></a>
<a name="get-auth-process"></a>
<a name="get-authorization_code"></a>
<a name="get-tokens"></a>
<a name="refresh_token"></a>
<a name="invalidate_token"></a>
<a name="force_login"></a>
<a name="implant"></a>
> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#section/Avtorizaciya/Avtorizaciya-polzovatelya)

---

# BRAND GUIDELINES

# Требования к использованию логотипов и названию приложений

Смотрите на сайте dev.hh.ru:
* [Требования к использованию логотипов](https://dev.hh.ru/articles/logos)
* [Требования к названию приложений](https://dev.hh.ru/articles/apps)


---

# CACHE

# Кэширование

В некоторых методах API имеется возможность кэширования ответов на стороне
клиента по заголовкам `Etag`, `Cache-Control` и `Expires`.


Если при запросе ресурса в API, был возвращён заголовок `Etag`, например,
запрос:

```
GET /areas/1 HTTP/1.1
Host: api.hh.ru
User-Agent: MyApp/1.0 (my-app-feedback@example.com)
```

вернул ответ:

```
HTTP/1.1 200 OK
Etag: W/"ai-356a192-57E047847BCE15-RU10e33"
Content-Type: application/json; charset=UTF-8
Content-Length: 61
Expires: Tue, 03 Oct 2017 07:01:04 GMT
Cache-Control: max-age=1200

{
    "areas": [],
    "id": "1",
    "name": "Москва",
    "parent_id": "113"
}
```

Клиент может запомнить значение заголовка `Etag` вместе с данными ответа и в
следующий раз, когда будет необходим данный ресурс, запросить информацию
об изменении ресурса, передав значение `Etag` в заголовке `If-None-Match`:

```
GET /areas/1 HTTP/1.1
Host: api.hh.ru
If-None-Match: W/"ai-356a192-57E047847BCE15-RU10e33"
User-Agent: MyApp/1.0 (my-app-feedback@example.com)
```

Если ресурс не поменялся, вернётся ответ с кодом `304 Not Modified`, не
содержащий тела:

```
HTTP/1.1 304 Not Modified
Etag: W/"ai-356a192-57E047847BCE15-RU10e33"
Cache-Control: max-age=1200
Expires: Tue, 03 Oct 2017 07:05:43 GMT
```

Если ресурс изменился, вернётся новое содержание ресурса:

```
HTTP/1.1 200 OK
Etag: W/"ai-34e7018-356a192b7913b0-RU73fda"
Content-Type: application/json; charset=UTF-8
Expires: Tue, 03 Oct 2017 07:10:31 GMT
Cache-Control: max-age=1200

{
    "areas": [],
    "id": "1",
    "name": "Москва",
    "parent_id": "777"
}
```

При проверке по `Etag` возможно использование HEAD запроса, он будет работать
аналогично, но даже в случае, если ресурс изменился, будет возвращены только
заголовки без тела ответа.

Кроме того, при запросе ресурса, в ответе есть заголовки `Cache-Control` и
`Expires`, которые позволяют клиенту закэшировать ответ и использовать его до
истечения указанного срока действия.

Более подробно в [RFC-7232](https://tools.ietf.org/html/rfc7232).


Кэширование поддерживается большинством
[справочников](../README.md#dictionaries). Определить поддержку можно по наличию
заголовка `Etag` в ответе.


---

# CORS

# Cross-Origin Resource Sharing (CORS)

API поддерживает технологию CORS для запроса данных из браузера с произвольного домена. Этот метод более предпочтителен,
чем использование JSONP. Более того, в отличии от JSONP, он неограничен методом GET.

Для отладки запросов с использованием CORS доступен специальный URL в API: `/cors`.
Он поддерживает методы HEAD, GET, POST, PUT, DELETE. На запрос с любым из этих методов вернётся стандартный ответ:

```json
{
    "method": "GET",
    "time": "2013-11-18T13:23:17+0400",
    "origin": null,
}
```

 Имя | Тип | Описание
 --- | --- | ---
 method | строка | использованный в запросе метод (HEAD, GET, POST, PUT, DELETE)
 time | строка | текущее время
 origin | строка, null | значение заголовка Origin в запросе, либо null







---

# EDUCATIONAL INSTITUTIONS

# Учебные заведения

> ‼️ Внимание! Значения в справочниках могут поменяться в любой момент. Не нужно завязываться на них.

По учебным заведениям можно получить следующую информацию:
* [Основная информация об учебных заведениях](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-educational-institutions-dictionary)
* [Список факультетов учебного заведения](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-educational-institutions-dictionary)

---

# EMPLOYER DICTIONARIES

Справочники работодателя
========================

> ‼️ Внимание! Значения в справочниках могут поменяться в любой момент. Не нужно завязываться на них.

В различных запросах может использоваться ранее введённая работодателем информация, к примеру, адреса офисов компании.
Для того, чтобы предоставить доступ к этой информации, используются справочники работодателя:

* [Адреса](https://api.hh.ru/openapi/redoc#tag/Adresa-rabotodatelya)
* [Менеджеры](employer_managers.md)
* [Департаменты](https://api.hh.ru/openapi/redoc#tag/Informaciya-o-rabotodatele/operation/get-employer-departments)
* [Тесты](https://api.hh.ru/openapi/redoc#tag/Spravochniki-rabotodatelya/operation/get-tests-dictionary)
* [Регионы вакансий](https://api.hh.ru/openapi/redoc#tag/Informaciya-o-rabotodatele/operation/get-employer-vacancy-areas)
* [Брендированные шаблоны вакансий](https://api.hh.ru/openapi/redoc#tag/Informaciya-o-rabotodatele/operation/get-vacancy-branded-templates-list)


---

# EMPLOYER MANAGERS

# Менеджеры работодателя

* [Справочник типов и прав менеджера](#dict)
* [Добавление менеджера](#add)
* [Редактирование менеджера](#edit)
* [Удаление менеджера](#delete)
* [Справочник менеджеров работодателя](#list)
* [Получение информации о менеджере](#item)

Для получения информации необходимо авторизоваться под работодателем.
Для пользователя без авторизации или для неправильно авторизованного пользователя вернется ответ `403 Forbidden`.

<a name="dict"></a>
## Справочник типов и прав менеджера

> ‼️ Внимание! Значения в справочниках могут поменяться в любой момент. Не нужно завязываться на них.

### Запрос
> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Menedzhery-rabotodatelya/operation/get-employer-manager-types)

<a name="add"></a>
## Добавление менеджера
> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Menedzhery-rabotodatelya/operation/add-employer-manager)

<a name="edit"></a>
## Редактирование менеджера
> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Menedzhery-rabotodatelya/operation/edit-employer-manager)

<a name="delete"></a>
## Удаление менеджера
> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Menedzhery-rabotodatelya/operation/delete-employer-manager)

<a name="list"></a>
## Справочник менеджеров работодателя

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Menedzhery-rabotodatelya/operation/get-employer-managers)

<a name="item"></a>
## Получение информации о менеджере

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Menedzhery-rabotodatelya/operation/get-employer-manager)



---

# EMPLOYER NEGOTIATIONS

# Переписка (отклики/приглашения) для работодателя

> <img src="http://hhru.github.io/api/badges/emp_paid.png" alt="employer with paid access" /> : Методы требуют наличия [платного доступа для работодателя](https://api.hh.ru/openapi/redoc#tag/Uslugi-rabotodatelya/operation/get-payable-api-method-access)

*Документация по переписке для соискателя доступна в [отдельной статье](negotiations.md).*

* [Модель работы, термины и процедуры](#model)
* [Общее описание процесса работы с откликами/приглашениями](#flow)
* [Коллекции и работодательские состояния откликов/приглашений](#collections)
* [Список откликов/приглашений](#negotiations-list)
* [Просмотр отклика/приглашения](#get-negotiation)
* [Просмотр списка сообщений в отклике/приглашении](#get-messages)
* [Отправка сообщения в отклике/приглашении](#add-messages)
* [Приглашение соискателя на вакансию](#add-invite)
* [Изменение состояния отклика/приглашения](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/change-negotiation-action)
* [Изменение состояния нескольких откликов/приглашений](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/put-negotiations-collection-to-next-state)
* [Просмотр предпочитаемой сортировки откликов](#get-preference-order)
* [Изменение предпочитаемой сортировки откликов](#update-preference-order)
* [Отметить отклики прочитанными](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/post-negotiations-topics-read) 


<a name="model"></a>
## Модель работы, термины и процедуры

Отклики и приглашения соответствуют модели, которая выражается в запросах и
ответах API. Если приложение использует модель правильно, то изменение
бизнес-логики откликов и приглашений не будет требовать переработки или
исправления.

В откликах и приглашениях используются понятия:

* *отклик* – объект, порождённый по инициативе соискателя (отклик на вакансию). 
  Отклик всегда происходит одним резюме на одну вакансию.

* *приглашение* – объект, порождённый по инициативе работодателя (приглашение на вакансию). 
  Приглашение всегда происходит к одному резюме на одну вакансию.

Кроме процесса появления объекта, работа с откликом или приглашением происходит
одинаково.

* <a name="term-collection"></a> *коллекция* – набор откликов/приглашений,
  объединённых по определённым критериям. Коллекции используются, когда в вашем
  приложении требуется **отобразить** список откликов/приглашений. Не стоит
  полагаться на то, что в определённые этапы обработки отклика/приглашения
  оно будет входить в известные коллекции, так как эта логика может изменяться.

* <a name="term-state"></a> *соискательское состояние отклика/приглашения* –
  статус отклика/приглашения ([поле `state`](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/get-collection-negotiations-list)), который **видит соискатель**. Возможные значения
  выдаются [в справочнике `negotiations_state`](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-dictionaries) и
  не зависят от вакансии в отклике/приглашении.

* <a name="term-employer-state"></a> *работодательское состояние отклика/приглашения* –
  статус отклика/приглашения у работодателя. Может отличаться от
  соискательского. Список возможных статусов
  **зависит от вакансии и работодателя**, поэтому список
  [необходимо запрашивать](#states), передавая нужную вакансию.

* <a name="term-action"></a> *действие по отклику/приглашению* – действие, которое
  можно выполнить над откликом/приглашением. В результате действия
  работодательское и соискательское состояния отклика/приглашения могут как
  поменяться, так и остаться прежними.

Не следует путать *действие*, *коллекцию* и *состояние* – они могут быть похожи,
но предназначены для разных целей.


<a name="flow"></a>
## Общее описание процесса работы с откликами/приглашениями

Вся работа с откликами/приглашениями происходит в рамках
**одной выбранной вакансии**. Даже у одного работодателя могут быть вакансии
с различными правилами работы по откликам/приглашениям.

Сначала необходимо получить список
[коллекций и работодательских состояний](#collections). Используйте коллекции
для **получения списков откликов/приглашений**. Предлагайте пользователю
выбирать, какую из коллекций он хочет получить. Для получения всех
откликов/приглашений нужно последовательно получить все коллекции. Список
состояний используется только как справочник.

Для **создания приглашения** необходимо запросить вакансии работодателя,
применимые к выбранному резюме. Получить эту информацию можно в
[списке вакансий работодателя](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/get-active-vacancy-list), там же
будут указаны необходимые параметры (ключ `arguments`) и состояние созданного
отклика (ключ `resulting_employer_state`). У разных работодателей и разных
вакансий могут быть различные правила и состояния добавляемого отклика. Для
каждой пары *вакансия + резюме* может быть только один отклик/приглашение.

Для создания приглашения, работодатель должен иметь активированный доступ к базе
резюме. Для работы с существующим откликом/приглашением доступ не требуется. Это
позволяет обрабатывать отклики на вакансии, даже не имея доступ к базе резюме.

Если вам необходимо **совершить действие** по отклику/приглашению,
ориентируйтесь на список действий, который будет доступен в
[списке (коллекции) откликов/приглашений](#negotiations-list) и в
[отдельном отклике/приглашении](#get-negotiation). Если действие приводит
к смене состояния по отклику/приглашению, это будет явно указано в ключе
`resulting_employer_state`. Не все действия приводят к смене состояния.

После приглашения соискателя вы можете начать с ним
[свободную переписку](#get-messages). Вы сможете
[отправлять сообщения](#add-messages), а соискатель – вам отвечать.
При необходимости переписку для конкретной вакансии
[можно отключить](https://api.hh.ru/openapi/redoc#tag/Vakansii/operation/get-vacancy) (поле `allow_messages`).

Чтобы соискательский отклик считался просмотренным работодателем необходимо сделать одно из следующих действий:
* запросить список сообщений по урлу, 
пришедшему при запросе [списка (коллекции) откликов/приглашений](#negotiations-list) или 
[отдельного отклика/приглашения](#get-negotiation),
* [запросить сообщения](#get-messages) по отклику
* запросить резюме по урлу, пришедшему при запросе [списка (коллекции) откликов/приглашений](#negotiations-list) 
или [отдельного отклика/приглашения](#get-negotiation)
* с помощью отдельного метода [отметить определенные отклики как прочитанные](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/post-negotiations-topics-read)


<a name="states"></a>
<a name="collections"></a>
## Коллекции и работодательские состояния откликов/приглашений по вакансии

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/get-negotiations)

<a name="negotiations-list"></a>
## Список откликов/приглашений

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/get-collection-negotiations-list)

<a name="get-negotiation"></a>
## Просмотр отклика/приглашения

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/get-negotiation-item)

## Просмотр списка сообщений в отклике/приглашении

<a name="get-messages"></a>
> ‼️ Обратите внимание, что методы для работы с сообщениями в рамках отклика/приглашения от имени [соискателя](docs/negotiations.md#get_messages) и
> [менеджера работодателя](docs/employer_negotiations.md#get-messages) устарели, и новые возможности [чатов](https://feedback.hh.ru/knowledge-base/article/1290) в них не будут поддерживаться.
> В связи с этим переписка может некорректно отображаться.

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/get-negotiation-messages)

<a name="add-messages"></a>
## Отправка сообщения в отклике/приглашении

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/send-negotiation-message)

<a name="add-invite"></a>
## Приглашение соискателя на вакансию

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/invite-applicant-to-vacancy)

<a name="actions"></a>
<a name="put-on-hold"></a>
<a name="invite"></a>
<a name="discard"></a>
## Действия по отклику/приглашению 

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/put-negotiations-collection-to-next-state)


<a name="get-preference-order"></a>
## Просмотр предпочитаемой сортировки откликов

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/get-pref-negotiations-order)

<a name="update-preference-order"></a>
## Изменение предпочитаемой сортировки откликов

### Запрос

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/put-pref-negotiations-order)



---

# EMPLOYER NEGOTIATIONS STATISTICS

# Статистика по работе с откликами

* [Статистика работодателя](#employer-stats)
* [Статистика менеджера](#manager-stats)

Для получения информации необходимо авторизоваться под работодателем.
Для пользователя без авторизации или для неправильно авторизованного пользователя вернется ответ `403 Forbidden`.
Статистика менеджера доступна самому менеджеру, а также менеджерам с [типом](employer_managers.md#dict) `main_contact_person`.

<a name="employer-stats"></a>
## Статистика работодателя

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/get-negotiations-statistics-employer)

<a name="manager-stats"></a>
## Статистика менеджера

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Otklikipriglasheniya-rabotodatelya/operation/get-negotiations-statistics-manager)



---

# EMPLOYER RESUMES

# Резюме

* [Просмотр резюме](#item)
* [Короткое представление резюме](#resume-nano)
* [Сокращенное представление резюме](#resume-short)
* [Ссылки на скачивание резюме в нескольких форматах](#download-links)
* [Скрытые поля в резюме](#hidden-fields)


<a name="item"></a>
## Просмотр резюме

> <img src="http://hhru.github.io/api/badges/emp_paid.png" alt="employer with paid access" /> : Для работодателя данный метод требует наличия [платного доступа](https://api.hh.ru/openapi/redoc#tag/Uslugi-rabotodatelya/operation/get-payable-api-method-access)

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Prosmotr-rezyume/operation/get-resume)

<a name="resume-nano"></a>
## Короткое представление резюме

Самое короткое представление резюме:

```json
{
    "id": "502ff8b100018bddf30039ed1f63735f4dda66",
    "title": "консультант",
    "url": "https://api.hh.ru/resumes/502ff8b100018bddf30039ed1f63735f4dda66"
}
```

где:

 Имя  | Тип    | Описание
 ---- | ------ | ---
 id   | строка | Идентификатор резюме
 title | строка | Желаемая должность
 url  | строка | Ссылка на получение полной версии резюме


<a name="resume-short"></a>
## Сокращенное представление резюме

Отличается от полного представления отсутствием некоторых полей. Например, если указано более одно среднего образования - вернется только уровень образования. 

```json
{
    "id": "0123456789abcdef",
    "title": "Начинающий специалист",
    "url": "https://api.hh.ru/resumes/0123456789abcdef",
    "first_name": "Иван",
    "last_name": "Иванов",
    "middle_name": "Иванович",
    "can_view_full_info": true,
    "age": 19,
    "alternate_url": "https://hh.ru/resume/0123456789abcdef",
    "created_at": "2015-02-06T12:00:00+0300",
    "updated_at": "2015-04-20T16:24:15+0300",
    "area": {
        "id": "1",
        "name": "Москва",
        "url": "https://api.hh.ru/areas/1"
    },
    "certificate": [
        {
            "achieved_at": "2015-01-01",
            "owner": null,
            "title": "тест",
            "type": "custom",
            "url": "http://example.com/"
        }
    ],
    "education": {
        "primary": [],
        "level": {
            "id": "secondary",
            "name": "Среднее"
        },
    },
    "total_experience": {
        "months": 118
    },
    "experience": [
        {
            "position": "пастух",
            "start": "2010-01-01",
            "end": null,
            "company": "Рога и копыта",
            "industries": [
                {
                    "id": "51.643",
                    "name": "Благоустройство и уборка территорий и зданий"
                },
                {
                    "id": "29.503",
                    "name": "Земледелие, растениеводство, животноводство"
                }
            ],
            "company_url": "http://example.com/",
            "area": {
                "id": "1",
                "name": "Москва",
                "url": "https://api.hh.ru/areas/1"
            },
            "company_id": null,
            "employer": null
        },
        {
            "start": "2005-01-01",
            "end": "2009-03-01",
            "company": "HeadHunter",
            "area": {
                "id": "1",
                "name": "Москва",
                "url": "https://api.hh.ru/areas/1"
            },
            "industries": [
                {
                    "id": "7.513",
                    "name": "Интернет-компания (поисковики, платежные системы, соц.сети, информационно-познавательные и развлекательные ресурсы, продвижение сайтов и прочее)"
                }
            ],
            "company_url": "https://hh.ru",
            "company_id": "1455",
            "employer": {
                "alternate_url": "https://hh.ru/employer/1455",
                "id": "1455",
                "logo_urls": {
                    "90": "https://hh.ru/employer/logo/1455"
                },
                "name": "HeadHunter",
                "url": "https://api.hh.ru/employers/1455"
            }
        }
    ],
    "gender": {
        "id": "male",
        "name": "Мужской"
    },
    "salary": {
        "amount": 1000000,
        "currency": "RUR"
    },
    "photo": {
        "medium": "https://hh.ru/...",
        "small": "https://hh.ru/...",
        "id": "1337"
    },
    "owner": {
        "id": "123456",
        "comments": {
            "url": "https://api.hh.ru/applicant_comments/123456",
            "counters": {
                "total": 7
            }
        }
    },
    "negotiations_history": {
        "url": "https://api.hh.ru/resumes/0123456789abcdef/negotiations_history"
    },
    "download": {
        "pdf": {
            "url": "https://hh.ru/api_resume_converter/0123456789abcdef/ИвановИванИванович.pdf?type=pdf"
        },
        "rtf": {
            "url": "https://hh.ru/api_resume_converter/0123456789abcdef/ИвановИванИванович.rtf?type=rtf"
        }
    }
}
```

<a name="download-links"></a>
## Ссылки на скачивание резюме

В настоящий момент резюме доступны для скачивания в форматах PDF и RTF.
Соискатель может скачать свои резюме.  
Название скачиваемого файла может содержать имя соискателя или его желаемую должность.

### Запрос

Для скачивания резюме нужно использовать полученный из ответа API url, передавая [стандартные для API заголовки](https://api.hh.ru/openapi/redoc#section/Obshaya-informaciya/Trebovaniya-k-zaprosam).

```
GET https://....(ссылка, полученная в полной или сокращенной выдаче резюме API)
```

### Ответ

Успешный ответ приходит с кодом 200 и содержит в теле запрашиваемый файл.

### Ошибки

* `404 Not Found` - если резюме не существует или недоступно пользователю.
* `429 Too Many Requests` - если превышен лимит просмотров резюме в сутки (при авторизации работодателем).
* `403 Forbidden` - Не хватает услуг для скачивания резюме с контактами

Дополнительно к HTTP коду сервер может вернуть описание
[причины ошибки](errors.md#resumes).

<a name="hidden-fields"></a>
## Скрытые поля в анонимном резюме

В поле `hidden_fields` содержится список скрытых соискателем полей анонимного резюме. Скрытые поля заменяются на `null`.

Скрываемые поля в зависимости от значения в поле:
* `names_and_photo` — заменяет на `null` значение полей `first_name`, `last_name`, `middle_name` и `photo`.
* `phones` — заменяет на `null` значение поля `contact[].value` с полем `contact[].type`, равным `cell`, `work` или `home`
* `email` — заменяет на `null` значение поля `contact[].value` с полем `contact[].type`, равным `email`
* `other_contacts` — заменяет на `null` значение полей `site[].url`
* `experience` — заменяет на `null` поля `experience[].company`, `experience[].company_id`, `experience[].company_url`, `experience[].employer`; заменяет значение поля `recommendation` на пустой список


---

# EMPLOYER VACANCIES

# Вакансии для работодателя

* [Варианты публикации вакансий](#available_types)
* [Публикация вакансий](#creation)
* [Условия заполнения полей при добавлении и редактировании вакансий](#conditions)
* [Редактирование вакансий](#edit)
* [Продление вакансий](#prolongate)
* [Информация о возможности продления вакансии](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/get-prolongation-vacancy-info)
* [Список опубликованных вакансий](#active)
* [Архивация вакансий](#archive)
* [Список архивных вакансий](#archived)
* [Удаление вакансий](#hide)
* [Список удаленных вакансий](#hidden)
* [Восстановление из удаленных](#restore)
* [Статистика по вакансии](#stats)
* [Просмотры вакансии](#visitors)

Смотрите также:

* [Дополнительные поля для автора вакансии при получении вакансии](vacancies.md#author)


<a name="available_types"></a>
## Варианты публикации вакансий у текущего менеджера

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Informaciya-o-menedzhere/operation/get-available-vacancy-types)

<a name="creation"></a>
## Публикация вакансий

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/publish-vacancy)

<a name="conditions"></a>
## Условия заполнения полей при добавлении и редактировании вакансий

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/get-vacancy-conditions)

<a name="edit"></a>
## Редактирование вакансий

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/edit-vacancy)

<a name="other-actions"></a>
### Прочие действия

* [архивация](#archive)
* [удаление](#hide)
* [восстановление из удаленных](#restore)


<a name="prolongate"></a>
## Продление вакансий
> > !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/vacancy-prolongation)

## Информация о возможности продления вакансии
> > !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/get-prolongation-vacancy-info)

<a name="active"></a>
## Список опубликованных вакансий

> > !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/get-active-vacancy-list)

<a name="archive"></a>
## Архивация вакансий

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/add-vacancy-to-archive)

<a name="archived"></a>
## Список архивных вакансий

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/get-archived-vacancies)

<a name="hide"></a>
## Удаление вакансий

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/add-vacancy-to-hidden)

<a name="hidden"></a>
## Список удаленных вакансий

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/get-hidden-vacancies)

<a name="restore"></a>
## Восстановление из удаленных

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/restore-vacancy-from-hidden)

<a name="stats"></a>
## Статистика по вакансии

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/get-vacancy-stats)

<a name="visitors"></a>
## Просмотры вакансии

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/get-vacancy-visitors)


---

# EMPLOYER VACANCIES ACCEPT KIDS

<a name="accept-kids"></a>
# Вакансия доступна для соискателей от 14 лет

Публикация вакансий для соискателей от 14 лет допустима только на территории Российской Федерации. 
Права публиковать вакансии с пометкой для соискателей от 14 лет есть у подтвержденных Российских работодателей. Для получения права для иностранной компании обратитесь к персональному менеджеру.

После получения права, появится возможность публиковать новые вакансии с данным параметром, либо обновлять имеющиеся вакансии.

## Публикация вакансии

Для пубилкации вакансии, доступной для соискателей от 14 лет, необходимо в тело запроса `POST /vacancies` добавить параметр
```json
{
    "accept_kids": true
}
```
[Основная статья про публикацию вакансии](employer_vacancies.md#creation)

## Обновление вакансии

Для обновления вакансии, выполните запрос

`PUT /vacancies/{vacancy_id}` 

Тело запроса:
```json
{
    "accept_kids": true
}
```
[Основная статья про редактирование вакансии](employer_vacancies.md#edit)

<a name="edit-results"></a>
## Ошибка и код ответа

В случае, если у пользователя недостаточно прав на редактирование поля accept_kids, либо вакансия публикуется за пределами РФ, то дополнительно к HTTP коду `400 Bad Request` сервер вернет описание причины ошибки: 
```json
{
    "errors": [
        {
            "type": "vacancies",
            "value": "can_not_accept_kids"
        }
    ]
}
```

## Дополнительная информация

[https://hh.ru/article/20732](https://hh.ru/article/20732)


---

# ERRORS

# Ошибки и коды ответов

* [Ошибка в запросе](#general-errors)
* [Системная ошибка](#system-errors)
* [Неверный User-Agent](#user-agent)
* [Получение/обновление токенов](#oauth-get-errors)
* [Ошибки использования авторизации](#oauth)
* [Ошибки доступа к платному методу](#employer_payable_methods)
* [Ошибки отдельных ресурсов](#service-errors)
* [Сохраненные поиски резюме](#resumes-saved-searches)
* [Переписка (отклики/приглашения)](#negotiations)
* [Публикация и редактирование вакансий](#vacancies-create-n-edit)
* [Продление вакансии](#vacancies-prolongate)
* [Менеджеры работодателя](#employer_managers)
* [Работа с резюме](#resumes)
* [Рабочие аккаунты менеджера](#manager-accounts)
* [Необходимость пройти капчу](#captcha_required)

API широко использует информирование при помощи HTTP кодов ответов. Приложение
должно корректно их обрабатывать.

При каждой ошибке, помимо кода ответа, в теле ответа выдаётся
дополнительная информация, позволяющая разработчику понять 
причину ошибки.

Все ошибки выдаются в формате:

```json
{
    "errors": [
        {
            "type": "...",
            "value": "..."
        }
    ]
}
```

Одновременно может выдаваться несколько ошибок.
Ключ `type` присутствует в каждом объекте массива `errors` и содержит текстовый
идентификатор класса ошибки. Ключ `value` опционален и конкретизирует данные
об ошибке.

> Помимо описанных выше `errors`, API может выдавать дополнительно другие ключи,
> оставленные для обратной совместимости. **Использовать их не рекомендуется.**


<a name="general-errors"></a>
## Ошибка в запросе

В случае невозможности найти запрашиваемый ресурс вернётся ответ
`404 Not Found` и в массиве `errors` будет объект:

```json
{
    "type": "not_found"
}
```

При ошибке в параметрах запроса (к примеру,
`GET https://api.hh.ru/vacancies/?employer_id=foo`) в ответ придёт
`400 Bad Request`, в массиве ошибок будет объект:

```json
{
    "type": "bad_argument",
    "value": "employer_id"
}
```

<a name="system-errors"></a>
## Системная ошибка

Если в данный момент сервис не может обработать запрос, но он его корректно
понял, то в ответ придёт `503 Service Unavailable` и `type` будет содержать
`service_unavailable`.

В случае непредвиденной ситуации API вернёт 500.

В редких случаях ошибки с 5** кодами могут возвращаться с телом не содержащим
валидный json. Приложение должно в таких случаях ориентироваться только на код
ответа.


## Общие ошибки запроса

<a name="user-agent"></a>
### Неверный User-Agent

Подробнее про [заголовок User-Agent](https://api.hh.ru/openapi/redoc#section/Obshaya-informaciya/Trebovaniya-k-zaprosam).

HTTP code | type | value | описание
----------|------|-------|-----------
400 | bad_user_agent | unset | заголовок User-Agent не передан
400 | bad_user_agent | blacklisted | значение User-Agent в чёрном списке


## Ошибки авторизации

Подробнее [про авторизацию](authorization.md).


<a name="oauth-get-errors"></a>
### Описание ошибок при получении/обновлении токенов

Описание полей:

Имя | Тип | Значение 
--- | --- | --------
error | строка | Одно из значений, [описанных в стандарте RFC 6749](http://tools.ietf.org/html/rfc6749#section-5.2). Например, `invalid_request`, если какой либо из обязательных параметров не был передан
error_description | строка | Дополнительное описание ошибки


Ниже приведены некоторые возможные ошибки с описанием.

<table>
<tr><th>HTTP code</th><th>error</th><th>error_description</th><th>описание</th></tr>

<tr>
    <td rowspan=8>400</td>
    <td rowspan=8>invalid_request</td>
    <td>account not found</td>
    <td>Ошибка может возникнуть, если передана неправильная пара client_id и client_secret</td>
</tr>
<tr>
    <td>account is locked</td>
    <td>Пользовательский аккаунт заблокирован. Пользователь должен обратиться в <a href="https://github.com/hhru/api#feedback">службу поддержки сайта</a></td>
</tr>
<tr>
    <td>password invalidated</td>
    <td>Пароль от пользовательского аккаунта устарел. Пользователь должен восстановить пароль на сайте <a href="https://hh.ru">https://hh.ru</a></td>
</tr>
<tr>
    <td>login not verified</td>
    <td>Пользовательский аккаунт не подтвержден. Пользователь должен обратиться в <a href="https://github.com/hhru/api#feedback">службу поддержки сайта</a></td>
</tr>
<tr>
    <td>bad redirect url</td>
    <td>Передан неправильный redirect_url</td>
</tr>
<tr>
    <td>token is empty</td>
    <td>Не передан refresh_token</td>
</tr>
<tr>
    <td>token not found</td>
    <td>Передан не правильный refresh_token</td>
</tr>
<tr>
    <td>code not found</td>
    <td>Переданный authorization_code не найден</td>
</tr>

<tr>
    <td>400</td>
    <td>invalid_client</td>
    <td>client_id or client_secret not found</td>
    <td>Ошибка может возникнуть в случае, если данный client_id не найден или был удален, передан неправильный client_secret</td>
</tr>

<tr>
    <td rowspan=8>400</td>
    <td rowspan=8>invalid_grant</td>
    <td>token has already been refreshed</td>
    <td>Ошибка возникает при попытке воспользоваться refresh-токеном второй раз</td>
</tr>
<tr>
    <td>token not expired</td>
    <td>Ошибка возникает при попытке обновить действующий access-токен. access-токен можно обновлять только после того, как он истек</td>
</tr>
<tr>
    <td>token was revoked</td>
    <td>Токен был отозван. Например, токен отзывается, если время действия пароля истекло</td>
</tr>
<tr>
    <td>bad token</td>
    <td>Передано неправильное значение токена</td>
</tr>
<tr>
    <td>code has already been used</td>
    <td>authorization_code уже был использован (его можно использовать только один раз)</td>
</tr>
<tr>
    <td>code expired</td>
    <td>authorization_code истек</td>
</tr>
<tr>
    <td>code was revoke</td>
    <td>authorization_code был отозван (это происходит, если время действия пароля истекло)</td>
</tr>
<tr>
    <td>token deactivated</td>
    <td>Токен был деактивирован. Токен деактивируется после того, как пользователь сменил пароль</td>
</tr>

<tr>
    <td>400</td>
    <td>unsupported_grant_type</td>
    <td>unsupported grant_type</td>
    <td>Возникает, если передать неправильное значение в поле grant_type</td>
</tr>

<tr>
    <td>403</td>
    <td>forbidden</td>
    <td>app token refresh too early</td>
    <td>Возникает, если запрашивать token приложения чаще чем раз в пять минут</td>
</tr>

</table>


<a name="oauth"></a>
### Ошибки использования авторизации

В случае, если вы
[совершаете авторизованный запрос](authorization.md#check-access_token)
в api и предоставленная авторизация по каким-либо причинам не действительна,
вернётся ошибка с `type` `oauth` и, возможно, одним из перечисленных `value`.

HTTP code | type | value | описание
----------|------|-------|-----------
403 | oauth | bad_authorization | токен авторизации не существует или не валидный
403 | oauth | token_expired | время жизни access_token завершилось, необходимо [выполнить обновление access_token](https://api.hh.ru/openapi/redoc#tag/Avtorizaciya-rabotodatelya/operation/authorize)
403 | oauth | token_revoked | токен отозван пользователем, необходимо [запросить новую авторизацию](authorization.md)
403 | oauth | application_not_found | ваше приложение было удалено
403 | oauth | user_auth_expected | выполняется запрос с авторизацией приложения, для выполнения которого необходима [авторизация пользователя](authorization_for_user.md)

<a name="employer_payable_methods"></a>
## Ошибки доступа к платному методу

В случае, если вы запрашиваете один из [платных методов](https://api.hh.ru/openapi/redoc#tag/Uslugi-rabotodatelya/operation/get-payable-api-method-access) 
без купленного доступа, вернётся следующая ошибка:

HTTP code | type | value | описание
----------|------|-------|-----------
403 | api_access_payment | action_must_be_payed | запрос платного метода при отсутствии оплаченного доступа


<a name="service-errors"></a>
## Ошибки отдельных ресурсов

В тех случаях, когда сервис способен выдать более подробную информацию об
ошибке, она будет выдана в теле ответа. В этом случае скорее всего
код ответа будет 400, 403, 409, 429, но возможны и другие.

Как минимум, приложение должно корректно обрабатывать HTTP статусы ответов.
Для более удобной работы с приложением, рекомендуется также обрабатывать
пришедший тип ответа. Приведенные ниже таблицы содержат неполный список ошибок,
он может расширяться.

<a name="resumes-saved-searches"></a>
### Сохраненные поиски резюме

Помимо кода ошибки при
[передаче сохраненного поиска резюме другому менеджеру](https://api.hh.ru/openapi/redoc#tag/Sohranennye-poiski-rezyume/operation/move-saved-resume-search),
могут быть возвращены следующие ошибки:

HTTP code | type | value | описание
----------|------|-------|-----------
404 | saved_searches | saved_search_not_found | автопоиск не был найден или не принадлежит текущему пользователю
404 | saved_searches | manager_not_found | несуществующий manager_id


<a name="negotiations"></a>
### Переписка (отклики/приглашения)

Помимо [общих ошибок](#general-errors), могут быть возвращены следующие ошибки:

HTTP code | type | value | описание
----------|------|-------|-----------
400 | negotiations | vacancy_not_found | вакансия не найдена
403 | negotiations | invalid_vacancy | вакансия из отклика/приглашения была архивирована либо скрыта
400 / 403 | negotiations | resume_not_found | резюме из отклика/приглашения было скрыто, либо удалено, либо не найдено
403 | negotiations | already_applied | уже есть отклик/приглашение на указанную связку resume_id+vacancy_id
403 | negotiations | test_required | для отклика необходимо пройти тест (в данный момент, отклик на такие вакансии через API недоступен)
403 | negotiations | resume_visibility_conflict | невозможно откликнуться на анонимную вакансию резюме с видимостью "белый список"
403 | negotiations | edit_forbidden | редактирование сообщения недоступно
403 | negotiations | application_denied | общая ошибка запрета отклика в случае, когда дополнительная информация недоступна
400 / 403 | negotiations | limit_exceeded | превышен лимит количества откликов/приглашений
403 | negotiations | wrong_state | действие по отклику/приглашению в данном статусе невозможно
403 | negotiations | empty_message | передан пустой текст письма
403 | negotiations | too_long_message | передан слишком длинный текст письма
403 | negotiations | address_not_found | переданный к действию по адрес не существует, либо принадлежит другому работодателю
403 | negotiations | not_enough_purchased_services | не хватает оплаченных услуг, обычно [доступа к базе резюме](https://hh.ru/price#dbaccess)
403 | negotiations | in_a_row_limit | превышено количество последовательных сообщений в переписке, оппонент должен ответить на сообщение, чтобы появилась возможность писать вновь
403 | negotiations | overall_limit | превышен лимит сообщений
403 | negotiations | no_invitation | переписка недоступна, так как в отклике ещё не было приглашения
403 | negotiations | message_cannot_be_empty | сообщение в переписке не может быть пустым
403 | negotiations | disabled_by_employer | возможность переписки по отклику отключена работодателем
403 | negotiations | resume_deleted | отправить сообщение невозможно, так как резюме, с которым совершался отклик, удалено или скрыто
403 | negotiations | archived | отправить сообщение невозможно, так как вакансия, на которую совершался отклик, заархивирована
403 | negotiations | chat_archived | действие по отклику/приглашению невозможно, так как отклик/приглашение заархивировано


<a name="vacancies-create-n-edit"></a>
### Публикация и редактирование вакансий

Помимо кода ошибки при [публикации](employer_vacancies.md#creation) и
[редактировании](employer_vacancies.md#edit) вакансии могут быть возвращены
следующие ошибки:

HTTP code | type | value | reason | описание
----------|------|-------|-------|---------
400 | bad_json_data | *field_name* | *reason* | ошибка в поле вакансии, где *field_name* – ключ поля верхнего уровня, поле reason может не присутствовать
403 | vacancies | not_enough_purchased_services | | купленных услуг для публикации или обновления данного типа вакансии не достаточно
403 | vacancies | quota_exceeded | | квота менеджера на публикацию данного типа вакансии закончилась
403 | vacancies | duplicate | | аналогичная вакансия уже опубликована. В [ответе](#vacancies-duplicate-response) передается информация по дубликатам вакансии. Данную ошибку можно форсировано отключить (при [добавлении](employer_vacancies.md#creation) и [редактировании](employer_vacancies.md#edit-ignore-duplicates))
403 | vacancies | creation_forbidden | | публикация вакансий недоступна текущему менеджеру
403 | vacancies | unavailable_for_archived | | редактирование недоступно для архивной вакансии
403 | vacancies | conflict_changes | | конфликтные изменения данных вакансии ([подробнее](https://api.hh.ru/openapi/redoc#tag/Upravlenie-vakansiyami/operation/edit-vacancy))

#### Причины возникновения ошибок

reason | описание 
-------|---------
is_empty | пустое значение
wrong_size | значение имеет неправильный размер
is_too_short | значение имеет слишком маленький размер
is_too_long | значение имеет слишком большой размер
currency_code_is_invalid | валюта заработной платы введена некорректно
chosen_area_is_not_a_leaf_or_not_exist | местоположение вакансии введено неверно (например, передали id, которого нет) или не является конечным регионом (город, населенный пункт)
email_in_description | в описании вакансии содержится email
anonymous_vacancy_contains_address | в анонимной вакансии не должен содержаться адрес работодателя
anonymous_vacancy_has_real_company_name | в названии вакансии не должно содержаться название компании работодателя
only_for_anonymous_type | действие доступно только для анонимных вакансий
address_is_disabled | адрес недоступен
vacancy_type_employer_billing_type_mismatch | тип вакансии не совместим с текущим биллинг-типом
only_for_direct_type | действие доступно только для прямых вакансий
address_is_empty_with_checked_show_metro_flag | введен пустой адресс с указанием показывать метро
address_has_no_metro_but_checked_show_metro_flag | по введенному адресу не доступно метро, но указана опция показывать метро
default_vacancy_branded_template_is_invalid_or_not_enough_purchased_services | в запросе указан шаблон, который отсутствует в списке доступных шаблонов (этот список можно получить [запросом](https://api.hh.ru/openapi/redoc#tag/Informaciya-o-rabotodatele/operation/get-vacancy-branded-templates-list) ). Также шаблон может отсутствовать в списке доступных шаблонов, если не оплачена услуга использования [брендированного шаблона вакансии](https://hh.ru/price?from=menu#branding) 
department_code_prohibited_in_anonymous_vacancy | нельзя указать код подразделения для анонимной вакансии
branded_template_prohibited_in_anonymous_vacancy | использование брендированного шаблона невозможно для анонимной вакансии
value_conflict_with_business_rules | публикация вакансии с указанным billing_type запрещена

<a name="vacancies-duplicate-response"></a>
#### Пример ответа при ошибке duplicate

```json
{
    "errors": [
        {
            "type": "vacancies",
            "value": "duplicate",
            "found": 2,
            "items": [
                {
                    "id": 1337
                },
                {
                    "id": 78789890
                }
            ]
        }
    ]
}
```

### Поля ответа:

Имя | Тип | Описание
--- | --- | --------
found | number | Общее количество дубликатов вакансии
items | array | Ограниченное количество записей с информацией о дубликатах. Не гарантирует выдачу всех дубликатов.
items[].id | number | Идентификатор вакансии

<a name="vacancies-prolongate"></a>
### Продление вакансии

Помимо кода ошибки при [продлении](employer_vacancies.md#prolongate) вакансии могут быть
возвращены следующие ошибки:

HTTP code | type | value | описание
----------|------|-------|---------
403 | vacancies | not_enough_purchased_services | купленных услуг для продления данного типа вакансии не достаточно
403 | vacancies | quota_exceeded | квота менеджера на публикацию данного типа вакансии закончилась
403 | vacancies | prolongation_forbidden | продление вакансий недоступно текущему менеджеру
403 | vacancies | unavailable_for_archived | продление недоступно для архивной вакансии
403 | vacancies | too_early | продление раньше времени


<a name="employer_managers"></a>
### Менеджеры работодателя

Помимо [общих ошибок](#general-errors) при [редактировании](employer_managers.md#edit) менеджера работодателя могут быть возвращены следующие ошибки:

HTTP code | type | value | reason | описание
----------|------|-------|--------|---------
400 | managers | *field_name* | | ошибка в поле *field_name*
403 | managers | email | already_exist | менеджер с такой почтой уже существует
403 | managers |  | creation_limit_exceeded | достигнут лимит на создание менеджеров
403 | managers | *field_name* | not_editable | поле *field_name* недоступно для редактирования


<a name="resumes"></a>
### Работа с резюме

Помимо [общих ошибок](#general-errors) при
[получении](employer_resumes.md#item) и [обновлении](https://api.hh.ru/openapi/redoc#tag/Rezyume.-Sozdanie-i-obnovlenie/operation/edit-resume) резюме могут
быть возвращены следующие ошибки:

HTTP code | type | value | описание
----------|------|-------|---------
400 | bad_argument | with_contact | не правильное значение поля `with_contact`
400 | resumes | total_limit_exceeded | превышено допустимое количество резюме (актуально только для соискателей)
429 | resumes | view_limit_exceeded | превышен лимит просмотров резюме в сутки (актуально только для работодателей)
403 | resumes | quota_exceeded | превышена квота просмотров резюме установленная менеджеру (актуально только для работодателей)
403 | resumes | no_available_service | не хватает услуг для просмотра резюме
403 | resumes | cant_view_contacts | нет прав на просмотр контактов

Помимо `type` и `value` в теле ответа ошибки может вернуться `description` - описание при каких обстоятельствах возникает ошибка

<a name="bulk-request"></a>
#### bulk-запрос

HTTP code | type | value | reason | описание
----------|------|-------|---------|--------- 
400 | bad_argument | id | too_many_bulk_items | слишком много id
400 | bad_argument | id | | передан невалидный идентификатор

<a name="manager-accounts"></a>
### Рабочие аккаунты менеджера
HTTP code | type | value | описание
----------|------|-------|-----------
403 | manager_extra_accounts | manager_extra_account_not_found | В заголовке передан некорректный id аккаунта
403 | manager_accounts | used_manager_account_forbidden | [Рабочий аккаунт заблокирован](#manager-accounts-blocked)

<a name="manager-accounts-blocked"></a>
В случае, если аккаунт пользователя заблокирован, придет ошибка вида:
```json
{
    "errors": [
    {
        "type": "manager_accounts",
        "value": "used_manager_account_forbidden",
        "allowed_accounts": [
            {
                "id": "1",
                "employer": {
                    "id": "12345678",
                    "name": "Alpha Corp."
                }
            },
            {
                "id": "2",
                "employer": {
                    "id": "87654321",
                    "name": "Beta Inc."
                }
            }
        ]
    }
  ]
}
```
где `allowed_accounts` содержит массив доступных для этого токена аккаунтов
Элементы массива аналогичны [результату, выдаваемому в списке рабочих аккаунтов](https://api.hh.ru/openapi/redoc#tag/Menedzhery-rabotodatelya/operation/get-manager-accounts)
<a name="captcha_required"></a>
### Необходимость пройти капчу

Некоторые операции в API могут быть защищены капчей.
Наличие такой проверки явно указывается в описании ресурса.
При этом возвращается следующая ошибка:

```json
{
    "type": "captcha_required",
    "value": "captcha_required",
    "fallback_url": "https://hh.ru/account/connect/register....",
    "captcha_url": "https://hh.ru/account/captcha?state=..."
}
```

Имя | Тип | Описание
--- | --- | ---
fallback_url | string or null | Адрес веб-страницы, на котором можно выполнить аналогичную операцию (страница, чаще всего, сама защищена капчей)
captcha_url | string or null | Адрес веб-страницы, на котором можно пройти капчу. После прохождения капчи аналогичный запрос в апи должен выполниться успешно. Приложение должно добавить в `captcha_url` обязательный параметр `backurl`, на который произойдет редирект после прохождения капчи. `backurl` должен обязательно содержать схему, например, `https://` или схему приложения

Параметры `fallback_url` или `captcha_url` могут отсутствовать по-отдельности, но не могут отстутствовать одновременно.


---

# NEGOTIATIONS

# Переписка (отклики/приглашения) для соискателя

*Документация по переписке для работодателя доступна в [отдельной статье](employer_negotiations.md).*

В процессе использования сайта соискатели выбирают вакансии.  Для того чтобы
связаться с работодателем на предмет трудоустройства, соискатель может
откликнуться на выбранную вакансию. Так же и работодатель, найдя интересное
резюме, может предложить соискателю рассмотреть вакансию (приглашение).

Для указанных целей служат специальные сущности — отклики/приглашения.  В них
может быть указана вакансия, резюме и переписка соискателя с работодателем, в
каждый момент времени такие сущности находятся в одном из состояний. Переход
между состояниями сопровождается появлением сообщений с опциональным текстовым
описанием и прочими полями. Сообщения со статусом `null` не переводят весь
отклик в новое состояние.

* [Получение списка откликов](#get_negotiations)
* [Получение списка активных откликов](#get_negotiations_active)
* [Откликнуться на вакансию](#post_negotiation)
* [Просмотр отклика/приглашения](#get_negotiation)
* [Скрыть отклик](#hide_message)
* [Просмотр списка сообщений в отклике](#get_messages)
* [Отправка нового сообщения](#send_message)
* [Редактирование сообщения в отклике](#edit_message)


<a name="get_negotiations"></a>
## Получение списка откликов

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Perepiska-(otklikipriglasheniya)-dlya-soiskatelya/operation/get-negotiations)

<a name="get_negotiations_active"></a>
## Получение списка активных откликов

### Запрос

Для получения списка активных откликов используйте параметр `status=active` в запросе [списка откликов](#get_negotiations)
 ```
 GET /negotiations?status=active
 ```

До 20.04.20 для запроса активных вакансий использовался ресурс:

```
GET /negotiations/active
```

В настоящее время он является устаревшим и поддерживается для обратной совместимости.

<a name="post_negotiation"></a>
## Откликнуться на вакансию

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Vakansii/operation/apply-to-vacancy)

<a name="get_negotiation"></a>
## Просмотр отклика/приглашения

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Perepiska-(otklikipriglasheniya)-dlya-soiskatelya/operation/get-negotiation-item)

<a name="hide_message"></a>
## Скрыть отклик
> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Perepiska-(otklikipriglasheniya)-dlya-soiskatelya/operation/hide-active-response)


<a name="get_messages"></a>
## Просмотр списка сообщений в отклике

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Perepiska-(otklikipriglasheniya)-dlya-soiskatelya/operation/get-negotiation-messages)

<a name="send_message"></a>
## Отправка нового сообщения

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Perepiska-(otklikipriglasheniya)-dlya-soiskatelya/operation/send-negotiation-message)

<a name="edit_message"></a>
## Редактирование сообщений в отклике

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Perepiska-(otklikipriglasheniya)-dlya-soiskatelya/operation/edit-negotiation-message)


---

# PHONE CALLS

# История звонков

Информация о звонках может присутствовать на [списке откликов соискателя](negotiations.md#get_negotiations) и при просмотре [отклика/приглашения соискателя](negotiations.md#get_negotiation)

Объект выглядит следующим образом:

```json
{
    "picked_up_phone_by_opponent": true,
    "items": [
      {
        "id": 123,
        "status": "call_in_progress",
        "creation_time": "2022-03-04T19:39:58+0300",
        "last_change_time": null,
        "duration_seconds": null
      }
    ]
}
```

где:

Имя | Тип | Описание
 --- | --- | ---
picked_up_phone_by_opponent | boolean | ответил ли абонент соискателю хоть 1 раз 
items | массив | Массив звонков



<a name="phone_call"></a>
## Звонок

Пример завершенного звонка:

```json
{
  "id": 111,
  "status": "call_ended",
  "creation_time": "2022-03-04T19:39:58+0300",
  "last_change_time": "2022-03-04T19:41:58+0300",
  "duration_seconds": 120     
}
```

где:

Имя | Тип | Описание
 --- | --- | ---
id | число | Идентификатор звонка
status | строка | Статус звонка. Разрешенные значения находятся в справочнике [/dictionaries](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-dictionaries) в разделе ```phone_call_status```
creation_time | строка | Дата и время создания звонка
last_change_time | строка | Дата и время обновления звонка
duration_seconds | число | Длительность звонка в секундах


---

# SUGGESTS

# Подсказки

* [Подсказки по названиям университетов](#educational_institutions)
* [Подсказки по организациям](#companies)
* [Подсказки по специализациям](#specializations)
* [Подсказки по профессиональным ролям](https://api.hh.ru/openapi/redoc#tag/Podskazki/operation/get-professional-roles-suggests)
* [Подсказки по ключевым навыкам](#key-skills)
* [Подсказки по должностям резюме](#resume-positions)
* [Подсказки по регионам](#areas)
* [Подсказки по ключевым словам поиска вакансий](#vacancy-search-keyword)
* [Подсказки по ключевым словам поиска резюме](#resume-search-keyword)

<a name="educational_institutions"></a>
## Подсказки по названиям университетов
> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Podskazki/operation/get-educational-institutions-suggests)

<a name="companies"></a>
## Подсказки по организациям
> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Podskazki/operation/get-registered-companies-suggests)

<a name="specializations"></a>
## Подсказки по специализациям
> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Podskazki/operation/get-fields-of-study-suggestions)

<a name="key-skills"></a>
## Подсказки по ключевым навыкам
> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Podskazki/operation/get-skill-set-suggests)

<a name="resume-positions"></a>
## Подсказки по должностям резюме

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Podskazki/operation/get-positions-suggestions)

<a name="areas"></a>
## Подсказки по регионам

Подсказка по всем регионам
> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Podskazki/operation/get-areas-suggests)

Подсказка по всем регионам, являющимися листами в дереве регионов
> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Podskazki/operation/get-area-leaves-suggests)

<a name="vacancy-search-keyword"></a>
## Подсказки по ключевым словам поиска вакансий
> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Podskazki/operation/get-vacancy-search-keywords)

<a name="resume-search-keyword"></a>
## Подсказки по ключевым словам поиска резюме
> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Podskazki/operation/get-resume-search-keywords-suggests)


---

# VACANCIES

# Получение вакансий

* [Просмотр вакансии](#item)
* [Поиск по вакансиям](#search)
* [Поиск по вакансиям, похожим на вакансию](https://api.hh.ru/openapi/redoc#tag/Poisk-vakansij/operation/get-vacancies-similar-to-vacancy)
* [Короткое представление вакансии](#nano)

Смотрите также:

<a name="creation"></a>
<a name="creation-example"></a>
<a name="creation_fields"></a>
<a name="allow_messages"></a>
<a name="creation-results"></a>
<a name="conditions"></a>
<a name="edit"></a>
<a name="other-actions"></a>
<a name="prolongate"></a>
<a name="prolongate-info"></a>
<a name="branded-template-field"></a>

* [Вакансии для работодателя](employer_vacancies.md)
  * [Публикация вакансий](employer_vacancies.md#creation)
  * [Редактирование вакансий](employer_vacancies.md#edit)
  * [Продление вакансий](employer_vacancies.md#prolongate)
  * [Удаление вакансий](employer_vacancies.md#hide)


<a name="item"></a>
## Просмотр вакансии

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Vakansii/operation/get-vacancy)

<a name="search"></a>
## Поиск по вакансиям

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Poisk-vakansij/operation/get-vacancies)

<a name="similar"></a>
## Поиск по вакансиям, похожим на вакансию

### Запрос

> !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Poisk-vakansij/operation/get-vacancies-similar-to-vacancy)

<a name="nano"></a>
## Короткое представление вакансии

```json
{
    "id": "7760476",
    "premium": true,
    "has_test": true,
    "response_url": null,
    "address": null,
    "alternate_url": "https://hh.ru/vacancy/7760476",
    "apply_alternate_url": "https://hh.ru/applicant/vacancy_response?vacancyId=7760476",
    "department": {
        "id": "HH-1455-TECH",
        "name": "HeadHunter::Технический департамент"
    },
    "salary": {
        "to": null,
        "from": 100000,
        "currency": "RUR",
        "gross": true
    },
    "name": "Специалист по автоматизации тестирования (Java, Selenium)",
    "insider_interview": {
        "id": "12345",
        "url": "https://hh.ru/interview/12345?employerId=777"
    },
    "area": {
        "url": "https://api.hh.ru/areas/1",
        "id": "1",
        "name": "Москва"
    },
    "url": "https://api.hh.ru/vacancies/7760476",
    "published_at": "2013-10-11T13:27:16+0400",
    "relations": [],
    "employer": {
        "url": "https://api.hh.ru/employers/1455",
        "alternate_url": "https://hh.ru/employer/1455",
        "logo_urls": {
            "90": "https://hh.ru/employer-logo/289027.png",
            "240": "https://hh.ru/employer-logo/289169.png",
            "original": "https://hh.ru/file/2352807.png"
        },
        "name": "HeadHunter",
        "id": "1455"
    },
    "response_letter_required": false,
    "type": {
        "id": "open",
        "name": "Открытая"
    },
    "archived": "false",
    "working_days": [
        {
            "id": "only_saturday_and_sunday",
            "name": "Работа только по сб и вс"
        }
    ],
    "working_time_intervals": [
        {
            "id": "from_four_to_six_hours_in_a_day",
            "name": "Можно работать сменами по 4-6 часов в день"
        }
    ],
    "working_time_modes": [
        {
            "id": "start_after_sixteen",
            "name": "Можно начинать работать после 16-00"
        }
    ],
    "accept_temporary": false,
    "experience": {
      "id": "noExperience",
      "name": "Нет опыта"
    },
    "employment": {
      "id": "full",
      "name": "Полная занятость"
    },
    "show_logo_in_search": true
}
```

Описание полей смотрите в [выдаче полной вакансии](https://api.hh.ru/openapi/redoc#tag/Vakansii/operation/get-vacancy).

`url` и `alternate_url` могут принимать значение `null` в случае, если подробная
информация о вакансии недоступна (например, вакансия была удалена).


---

# VACANCIES FOR APPLICANT

# Работа с вакансиями для соискателя

* [Отобранные вакансии](#favorited)
* [Дополнительные поля вакансии для соискателей](#vacancy-fields-applicant)
* [Скрытые вакансии](https://api.hh.ru/openapi/redoc#tag/Skrytye-vakansii)


<a name="favorited"></a>
## Отобранные вакансии

Данные методы требуют авторизации соискателем, иначе вернут `403 Forbidden`.

## Получение списка отобранных вакансий
> > !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Otobrannye-vakansii/operation/get-favorite-vacancies)

## Добавление вакансии в список отобранных 
> > !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Otobrannye-vakansii/operation/add-vacancy-to-favorite)

## Удаление вакансии из списка отобранных
> > !! Данный метод доступен в [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Otobrannye-vakansii/operation/delete-vacancy-from-favorite)

<a name="vacancy-fields-applicant"></a>
## Дополнительные поля вакансии для соискателей

При авторизации соикателем возвращаются дополнительные поля:

```json
{
    "relations": [
        "favorited",
        "got_response"
    ],
    "negotiations_url": "https://api.hh.ru/negotiations?vacancy_id=8331228",
    "suitable_resumes_url": "https://api.hh.ru/vacancies/8331228/suitable_resumes"
}
```

Имя | Тип | Описание
---- | --- | --------
relations | array | При авторизации соискателем, возвращает связи с вакансией. Значения из [справочника vacancy_relation](https://api.hh.ru/openapi/redoc#tag/Obshie-spravochniki/operation/get-dictionaries).
negotiations_url | string | Cсылка для получения списка откликов/приглашений
suitable_resumes_url | string | Подходящие резюме на вакансию

Смотрите также [отклики на вакансии](negotiations.md#post_negotiation).


---

# VACANCY AUTOPUBLICATION

# Автопубликация вакансий 

Активная автопубликация у черновика означает, что ожидается оплата по счету, связанному с черновиком. При поступлении 
оплаты из черновика автоматически будет опубликована вакансия. Для получения информации об активных автопубликациях, 
воспользуйтесь [ресурсом с информаций по черновикам](https://api.hh.ru/openapi/redoc#tag/Chernoviki-vakansij).

## Отмена автоматической публикации вакансии из черновика

### Запрос

```DELETE /vacancies/auto_publication?draft_id=123456```

Где `draft_id` идентификатор черновика.    

### Ответ

Успешный ответ приходит с кодом `204 No Content`.

### Ошибки

* `403 Forbidden` — текущий пользователь не является работодателем
* `404 Not Found` — если черновик не найден или у пользователя нет прав на изменение данного черновика


---

# PAYABLE — RESUME

# Новая модель работы с базой резюме (поддержка в API)

С [1 августа 2020 года мы переходим на новые тарифы доступов к базе резюме](https://hh.ru/article/26941) с фиксированным количеством контактов соискателей.

Работодатели, использующие новый тариф, должны явно открывать контактную информацию при просмотре резюме из базы резюме.

При работе на сайте, для открытия контактной информации есть специальная кнопка "Показать контакты", а в API приходят специальные [ссылки в поле `actions`](https://api.hh.ru/openapi/redoc#tag/Prosmotr-rezyume/operation/get-resume) при [получении резюме по идентификатору](/docs/employer_resumes.md#item)

> С условиями оказания услуги можно ознакомиться по [ссылке](https://hh.ru/conditions) (пункт 3.40.)

> Ответы на большую часть вопросов можно найти в [статье](https://hh.ru/article/27029)

Для работодателей, которые еще НЕ перешли на новую модель или не используют поиск по базе резюме в API (только получают отклики и приглашения на свои вакансии) - ничего не изменится в текущем поведении API, никаких доработок производить не требуется.

## Изменения в API для работодателей с услугой доступа к базе данных с возможностью просмотра контактной информации

Для работодателей с определенными конфигурациями данной услуги (подробнее в блоке "API и автоматизация процессов" в [статье](https://hh.ru/article/27029)) появляются возможности в API:

* [Поиск резюме](https://api.hh.ru/openapi/redoc#tag/Poisk-rezyume/operation/search-for-resumes)
* [Cохраненные поиски резюме](https://api.hh.ru/openapi/redoc#tag/Sohranennye-poiski-rezyume/operation/get-saved-resume-searches)

Для уточнения наличия доступа к описанным возможностям можно воспользоваться специальным [методом](https://api.hh.ru/openapi/redoc#tag/Uslugi-rabotodatelya/operation/get-payable-api-method-access)

<a name="contact-data"></a>
## Просмотр резюме с контактами

> !Обратите внимание, существует ограничение на кол-во запросов к [методу просмотра резюме](/docs/employer_resumes.md#item), для резюме полученных при использовании [поиска по базе резюме](https://api.hh.ru/openapi/redoc#tag/Poisk-rezyume/operation/search-for-resumes). Для получение текущего лимита на кол-во запросов, можно воспользоваться специальным [методом](https://api.hh.ru/openapi/redoc#tag/Uslugi-rabotodatelya/operation/get-payable-api-actions), "id": "API_LIMITED". После превышения этого лимита, при запросе к [методу просмотра резюме](/docs/employer_resumes.md#item) вернется ошибка.

Если ни один менеджер пока что не просматривал резюме с контактами, то во всех местах, где показывается [полное](https://api.hh.ru/openapi/redoc#tag/Prosmotr-rezyume/operation/get-resume) 
или [сокращенное](/docs/employer_resumes.md#resume-short) резюме, будет отображаться резюме без контактов (null в соответствующих полях).

После того, как один из менеджеров компании просмотрит резюме с контактами оно начнет отображаться с контактами во всех местах и для всех 
менеджеров пока активна текущая услуга доступа к базе с возможностью просмотра контактной информации.

Для просмотра и скачивания резюме с контактами в API приходят специальные [ссылки в поле `actions`](https://api.hh.ru/openapi/redoc#tag/Prosmotr-rezyume/operation/get-resume) при получении резюме по идентификатору.
При использовании этих ссылок будет списание контакта у клиента. Так же при приглашении соискателя на вакансию будет происходить списание контакта. 
Списание происходит только один раз: либо при просмотре резюме с контактами, либо при приглашении соискателя на одну из вакансий компании.
Если соискатель откликнулся первым, списание происходить не будет. В этом случае будут сразу видны контакты, без дополнительных действий.

Если у работодателя подключена услуга доступа к базе данных с возможностью просмотра контактной информации, то списание за просмотр контакта происходит только 1 раз.
Если один из менеджеров компании просмотрел (не важно на сайте или с использованием API) резюме с контактами, то далее это резюме 
будет доступно с контактами любому менеджеру компании.

К контактной информации относится:
* Фамилия (`last_name`), имя (`first_name`), отчество (`middle_name`);
* Контактный телефон (`contact`, `type`==`cell`);
* e-mail (`contact`, `type`==`email`);
* Ссылки на социальные сети и другие сайты (`site`);
* Фотография (`photo`).

## Просмотр контактов "анонимного" резюме

> Обратите внимание, при запросе контактов возможна ситуация, когда пользователь скрыл контактные данные, тогда просмотр спишется, а в теле ответа придут null в соответствующих полях контактных данных, чтобы защитится от этого, необходимо смотреть на наличие интересующих вас полей в [hidden_fields](/docs/employer_resumes.md#hidden-fields) в резюме.


