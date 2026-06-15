app_name = "last_sale_price"
app_title = "Last Sale Price"
app_publisher = "Maas Consult Middle East Co"
app_description = "Show last sale price of selected item in Sales Invoice."
app_email = "github@maasconsult.co"
app_license = "gpl-3.0"

required_apps = ["erpnext"]

after_install = "last_sale_price.install.after_install"
after_migrate = "last_sale_price.install.after_migrate"

doctype_js = {
    "Sales Invoice": "public/js/sales_invoice.js"
}