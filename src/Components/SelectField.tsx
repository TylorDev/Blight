import * as Select from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";

export function SelectField<T extends string>({
  label,
  value,
  onValueChange,
  options,
  labels
}: {
  label?: string;
  value: T;
  onValueChange: (value: string) => void;
  options: T[];
  labels: Record<string, string>;
}) {
  return (
    <label className="field compact">
      {label ? <span>{label}</span> : null}
      <Select.Root value={value} onValueChange={onValueChange}>
        <Select.Trigger className="select">
          <Select.Value />
          <Select.Icon>
            <ChevronDown size={16} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="select-content">
            <Select.Viewport>
              {options.map((option) => (
                <Select.Item className="select-item" key={option} value={option}>
                  <Select.ItemText>{labels[option]}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </label>
  );
}
