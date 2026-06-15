import frappe


@frappe.whitelist()
def get_last_sales_prices(item_code=None, customer=None, all_customers=0, current_invoice=None, limit=10):
    try:
        limit = int(limit or 10)
    except Exception:
        limit = 10

    show_all = False
    if str(all_customers) in ["1", "true", "True", "yes", "Yes"]:
        show_all = True

    if not item_code:
        return []

    invoice_filters = {
        "docstatus": 1
    }

    if not show_all:
        if not customer:
            return []

        invoice_filters["customer"] = customer

    invoices = frappe.get_all(
        "Sales Invoice",
        filters=invoice_filters,
        fields=["name", "posting_date", "customer", "creation"],
        order_by="posting_date desc, creation desc",
        limit=500
    )

    invoice_names = []
    invoice_map = {}

    for inv in invoices:
        if current_invoice and inv.name == current_invoice:
            continue

        invoice_names.append(inv.name)
        invoice_map[inv.name] = inv

    if not invoice_names:
        return []

    item_rows = frappe.get_all(
        "Sales Invoice Item",
        filters={
            "parent": ["in", invoice_names],
            "parenttype": "Sales Invoice",
            "item_code": item_code
        },
        fields=[
            "parent",
            "item_code",
            "item_name",
            "qty",
            "rate",
            "price_list_rate",
            "net_rate",
            "amount"
        ],
        limit=1000
    )

    item_map = {}

    for row in item_rows:
        parent = row.parent

        if parent not in item_map:
            item_map[parent] = []

        item_map[parent].append(row)

    result = []
    count = 0

    for inv_name in invoice_names:
        if inv_name not in item_map:
            continue

        inv = invoice_map.get(inv_name)

        for row in item_map[inv_name]:
            result.append({
                "posting_date": inv.posting_date,
                "invoice": inv_name,
                "customer": inv.customer,
                "qty": row.qty,
                "rate": row.rate,
                "price_list_rate": row.price_list_rate,
                "net_rate": row.net_rate,
                "amount": row.amount
            })

            count = count + 1

            if count >= limit:
                break

        if count >= limit:
            break

    return result
