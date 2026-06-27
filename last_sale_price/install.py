import frappe


HTML_FIELD = "custom_last_sales_price"
CHECK_FIELD = "custom_all"
TARGET_COLUMN_BREAK = "column_break_39"
FALLBACK_INSERT_AFTER = "customer"

OLD_HTML_FIELD = "custom_last_sales_priceselectadd_a_item_to_view_the_price"

VISIBLE_ONLY_IN_DRAFT = "eval:doc.docstatus==0"


def after_install():
    create_last_sale_price_fields()


def after_migrate():
    create_last_sale_price_fields()


def create_last_sale_price_fields():
    delete_old_html_field()

    insert_after = get_last_field_in_column(
        doctype="Sales Invoice",
        column_break_fieldname=TARGET_COLUMN_BREAK,
        fallback_insert_after=FALLBACK_INSERT_AFTER
    )

    create_custom_field(
        doctype="Sales Invoice",
        fieldname=CHECK_FIELD,
        label="All",
        fieldtype="Check",
        insert_after=insert_after,
        depends_on=VISIBLE_ONLY_IN_DRAFT
    )

    create_custom_field(
        doctype="Sales Invoice",
        fieldname=HTML_FIELD,
        label="Add a Item to View the Last Sale Price",
        fieldtype="HTML",
        insert_after=CHECK_FIELD,
        depends_on=VISIBLE_ONLY_IN_DRAFT
    )

    frappe.clear_cache(doctype="Sales Invoice")


def get_last_field_in_column(doctype, column_break_fieldname, fallback_insert_after):
    meta = frappe.get_meta(doctype)
    fields = meta.fields or []

    found_column = False
    last_fieldname = None

    for field in fields:
        if field.fieldname == column_break_fieldname:
            found_column = True
            last_fieldname = field.fieldname
            continue

        if found_column:
            if field.fieldtype in ["Column Break", "Section Break", "Tab Break"]:
                break

            if field.fieldname not in [CHECK_FIELD, HTML_FIELD, OLD_HTML_FIELD]:
                last_fieldname = field.fieldname

    if found_column:
        return last_fieldname or column_break_fieldname

    if frappe.get_meta(doctype).has_field(fallback_insert_after):
        return fallback_insert_after

    return None


def create_custom_field(doctype, fieldname, label, fieldtype, insert_after=None, depends_on=None):
    custom_field_name = doctype + "-" + fieldname

    values = {
        "label": label,
        "fieldtype": fieldtype,
        "depends_on": depends_on or ""
    }

    if insert_after:
        values["insert_after"] = insert_after

    if frappe.db.exists("Custom Field", custom_field_name):
        frappe.db.set_value(
            "Custom Field",
            custom_field_name,
            values,
            update_modified=True
        )
        return

    doc_values = {
        "doctype": "Custom Field",
        "dt": doctype,
        "fieldname": fieldname,
        "label": label,
        "fieldtype": fieldtype,
        "depends_on": depends_on or ""
    }

    if insert_after:
        doc_values["insert_after"] = insert_after

    doc = frappe.get_doc(doc_values)
    doc.insert(ignore_permissions=True)


def delete_old_html_field():
    old_custom_field_name = "Sales Invoice-" + OLD_HTML_FIELD

    if frappe.db.exists("Custom Field", old_custom_field_name):
        frappe.delete_doc(
            "Custom Field",
            old_custom_field_name,
            ignore_permissions=True,
            force=True
        )
