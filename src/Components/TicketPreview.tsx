import { calculateTicketPreview, categoryLabels, formatCurrency } from "../app-data";

export function TicketPreview({
  preview
}: {
  preview: ReturnType<typeof calculateTicketPreview>;
}) {
  return (
    <section className="ticket-preview">
      <div className="preview-head">
        <strong>Costo estimado</strong>
        <span>Stock actual</span>
      </div>
      <div className="preview-lines">
        {preview.materials.map((material) => (
          <div className="preview-line" key={material.category}>
            <span>
              {categoryLabels[material.category]} x {material.quantity}
            </span>
            <span>{formatCurrency(material.averageCost)}</span>
            <strong>{formatCurrency(material.subtotal)}</strong>
          </div>
        ))}
      </div>
      <div className="preview-totals">
        <span>Materiales {formatCurrency(preview.materialTotal)}</span>
        <span>Crafting Tax por unidad {formatCurrency(preview.craftingTaxUnit)}</span>
        <span>Crafting Tax total {formatCurrency(preview.craftingTaxTotal)}</span>
        <strong>Inversion Total {formatCurrency(preview.investmentTotal)}</strong>
        <strong>Precio promedio por baston {formatCurrency(preview.unitCost)}</strong>
      </div>
    </section>
  );
}
