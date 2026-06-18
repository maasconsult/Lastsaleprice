// Last Sale Price - Sales Invoice JS

const LAST_PRICE_HTML_FIELD = "custom_last_sales_price";
const CHECK_FIELD = "custom_all";
const CHILD_TABLE_FIELD = "items";
const CHILD_DOCTYPE = "Sales Invoice Item";

frappe.ui.form.on("Sales Invoice", {
    refresh(frm) {
        toggle_last_sale_price_fields(frm);
        bind_last_price_row_click(frm);
        show_last_price_for_current_row(frm);
    },

    customer(frm) {
        show_last_price_for_current_row(frm);
    },

    custom_all(frm) {
        show_last_price_for_current_row(frm);
    },

    items_add(frm, cdt, cdn) {
        frm.__last_price_cdn = cdn;
        show_last_price_for_current_row(frm);
    },

    items_remove(frm) {
        show_last_price_for_current_row(frm);
    }
});

frappe.ui.form.on("Sales Invoice Item", {
    item_code(frm, cdt, cdn) {
        frm.__last_price_cdn = cdn;
        show_last_price_for_current_row(frm);
    },

    qty(frm, cdt, cdn) {
        frm.__last_price_cdn = cdn;
        show_last_price_for_current_row(frm);
    },

    rate(frm, cdt, cdn) {
        frm.__last_price_cdn = cdn;
        show_last_price_for_current_row(frm);
    },

    form_render(frm, cdt, cdn) {
        frm.__last_price_cdn = cdn;
        show_last_price_for_current_row(frm);
    }
});

function toggle_last_sale_price_fields(frm) {
    const show_fields = cint(frm.doc.docstatus) === 0;

    frm.toggle_display(CHECK_FIELD, show_fields);
    frm.toggle_display(LAST_PRICE_HTML_FIELD, show_fields);

    if (!show_fields) {
        render_last_price_html(frm, "");
    }
}

function is_last_sale_price_visible(frm) {
    return cint(frm.doc.docstatus) === 0;
}

function bind_last_price_row_click(frm) {
    if (frm.__last_price_click_bound) return;
    if (!frm.fields_dict[CHILD_TABLE_FIELD]) return;

    frm.__last_price_click_bound = true;

    frm.fields_dict[CHILD_TABLE_FIELD].grid.wrapper.on("click", ".grid-row", function () {
        const cdn = $(this).attr("data-name");

        if (cdn && locals[CHILD_DOCTYPE] && locals[CHILD_DOCTYPE][cdn]) {
            frm.__last_price_cdn = cdn;
            show_last_price_for_current_row(frm);
        }
    });
}

function get_current_item_row(frm) {
    if (
        frm.__last_price_cdn &&
        locals[CHILD_DOCTYPE] &&
        locals[CHILD_DOCTYPE][frm.__last_price_cdn]
    ) {
        return locals[CHILD_DOCTYPE][frm.__last_price_cdn];
    }

    const selected_rows = get_selected_item_rows(frm);

    if (selected_rows.length) {
        frm.__last_price_cdn = selected_rows[0].name;
        return selected_rows[0];
    }

    const rows = frm.doc.items || [];

    for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].item_code) {
            frm.__last_price_cdn = rows[i].name;
            return rows[i];
        }
    }

    return null;
}

function get_selected_item_rows(frm) {
    if (!frm.fields_dict[CHILD_TABLE_FIELD]) return [];

    try {
        return frm.fields_dict[CHILD_TABLE_FIELD].grid.get_selected_children() || [];
    } catch (e) {
        return [];
    }
}

function show_last_price_for_current_row(frm) {
    toggle_last_sale_price_fields(frm);

    if (!is_last_sale_price_visible(frm)) {
        return;
    }

    const row = get_current_item_row(frm);

    if (!row || !row.item_code) {
        render_last_price_html(frm, get_box_html("Add/select an item to view the last selling price."));
        return;
    }

    if (!cint(frm.doc.custom_all) && !frm.doc.customer) {
        render_last_price_html(frm, get_box_html("Select Customer or tick All to view last selling price."));
        return;
    }

    render_last_price_html(frm, get_box_html("Loading last selling price..."));

    frappe.call({
        method: "last_sale_price.api.get_last_sales_prices",
        args: {
            item_code: row.item_code,
            customer: frm.doc.customer || "",
            all_customers: cint(frm.doc.custom_all),
            current_invoice: frm.doc.name || "",
            limit: 10
        },
        callback: function (r) {
            const rows = r.message || [];

            if (!is_last_sale_price_visible(frm)) {
                render_last_price_html(frm, "");
                return;
            }

            if (!rows.length) {
                render_last_price_html(
                    frm,
                    get_box_html(
                        "No previous submitted Sales Invoice found for item <b>" +
                        escape_html(row.item_code) +
                        "</b>."
                    )
                );
                return;
            }

            render_last_price_html(frm, get_price_table_html(frm, row.item_code, rows));
        },
        error: function () {
            if (is_last_sale_price_visible(frm)) {
                render_last_price_html(frm, get_box_html("Could not load last selling price."));
            }
        }
    });
}

function render_last_price_html(frm, html) {
    if (!frm.fields_dict[LAST_PRICE_HTML_FIELD]) return;

    frm.fields_dict[LAST_PRICE_HTML_FIELD].$wrapper.html(html);
}

function get_price_table_html(frm, item_code, rows) {
    const currency = frm.doc.currency || frappe.defaults.get_default("currency") || "";
    const scope_label = cint(frm.doc.custom_all)
        ? "All Customers"
        : "Customer: " + escape_html(frm.doc.customer || "");

    let html = `
        <div style="padding: 10px; border: 1px solid #d1d8dd; border-radius: 6px;">
            <div style="font-weight: 600; margin-bottom: 6px;">
                Last Sale Price for Item: ${escape_html(item_code)}
            </div>

            <div style="font-size: 12px; color: #6c7680; margin-bottom: 8px;">
                ${scope_label}
            </div>

            <table class="table table-bordered" style="margin-bottom: 0;">
                <thead>
                    <tr>
                        <th style="width: 22%;">Date</th>
                        <th style="width: 28%;">Invoice #</th>
                        <th style="width: 20%; text-align: right;">Qty</th>
                        <th style="width: 30%; text-align: right;">Selling Price</th>
                    </tr>
                </thead>
                <tbody>
    `;

    rows.forEach(row => {
        html += `
            <tr>
                <td>${escape_html(frappe.datetime.str_to_user(row.posting_date || ""))}</td>
                <td>
                    <a href="/app/sales-invoice/${encodeURIComponent(row.invoice)}" target="_blank">
                        ${escape_html(row.invoice)}
                    </a>
                </td>
                <td style="text-align: right;">${format_number(row.qty)}</td>
                <td style="text-align: right;">${format_money(row.rate, currency)}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    return html;
}

function get_box_html(message) {
    return `
        <div style="padding: 10px; border: 1px dashed #d1d8dd; border-radius: 6px; color: #6c7680;">
            ${message}
        </div>
    `;
}

function format_money(value, currency) {
    value = flt(value || 0);

    try {
        return format_currency(value, currency);
    } catch (e) {
        return value.toFixed(2);
    }
}

function format_number(value) {
    value = flt(value || 0);

    try {
        return frappe.format(value, { fieldtype: "Float" });
    } catch (e) {
        return value.toFixed(2);
    }
}

function escape_html(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
