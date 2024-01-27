import { ButtonComponent, DropdownComponent, Menu, SuggestModal, TFile, TextAreaComponent, TextComponent, setIcon } from "obsidian"
import { BaseOptions } from "../../base/BaseField"
import { ISettingsModal } from "../../base/BaseSetting"
import { FileSuggest } from "src/suggester/FileSuggester"
import { ActionLocation, IFieldManager, LegacyField, Target, baseDisplayValue, fieldValueManager, isFieldActions, isSingleTargeted, isSuggest, removeValidationError, setValidationError } from "../../Field"
import MetadataMenu from "main"
import { BaseValueModal, IBaseValueModal, basicSuggestModal } from "../../base/BaseModal"
import { cleanActions } from "src/utils/modals"
import { Constructor } from "src/typings/types"
import { getIcon, mapFieldType } from "src/fields/Fields"
import { getExistingFieldForIndexedPath } from "src/fields/ExistingField"


//#region options values

export enum SourceType {
    "ValuesList" = "ValuesList",
    "ValuesListNotePath" = "ValuesListNotePath",
    "ValuesFromDVQuery" = "ValuesFromDVQuery"
}

export const SourceTypeKey: Record<keyof typeof SourceType, string> = {
    "ValuesList": "valuesList",
    "ValuesListNotePath": "valuesListNotePath",
    "ValuesFromDVQuery": "valuesFromDVQuery"
}

export const SourceTypeDisplay: Record<keyof typeof SourceType, string> = {
    "ValuesList": "Values defined in these settings",
    "ValuesListNotePath": "Values from a note",
    "ValuesFromDVQuery": "Values returned from a dataview query"
}

//#endregion

export interface Options extends BaseOptions {
    valuesNotePath?: string
    valuesList?: Record<string, string>
    dvQuery?: string
    sourceType: "ValuesListNotePath" | "ValuesList" | "ValuesFromDVQuery"
}

export interface DefaultedOptions extends Options {
    valuesList: Record<string, string>
}

export const DefaultOptions: DefaultedOptions = {
    sourceType: "ValuesList",
    valuesList: {}
}

export interface IListBaseSettingModal extends ISettingsModal<Options> {
    createSettingContainer(): void
}

export function settingsModal(Base: Constructor<ISettingsModal<DefaultedOptions>>): Constructor<IListBaseSettingModal> {
    return class SettingsModal extends Base {
        private valuesPromptComponents: TextComponent[] = []

        createSettingContainer() {
            const container = this.optionsContainer
            const sourceTypeContainer = container.createDiv({ cls: "field-container" });
            sourceTypeContainer.createDiv({ text: "Values source type", cls: "label" })
            sourceTypeContainer.createDiv({ cls: "spacer" });
            const sourceType = new DropdownComponent(sourceTypeContainer);

            Object.keys(SourceType).forEach((option: keyof typeof SourceType) => sourceType.addOption(option, SourceTypeDisplay[option]))
            sourceType.setValue(this.field.options.sourceType)

            const valuesListNotePathContainer = this.createListNotePathContainer(container);
            const presetValuesFieldsContainer = this.createValuesListContainer(container);
            const valuesFromDVQueryContainer = this.createValuesFromDVQueryContainer(container);

            const valuesContainers: Record<keyof typeof SourceType, HTMLDivElement> = {
                "ValuesList": presetValuesFieldsContainer,
                "ValuesListNotePath": valuesListNotePathContainer,
                "ValuesFromDVQuery": valuesFromDVQueryContainer
            }

            sourceType.onChange((value: keyof typeof SourceType) => {
                this.field.options.sourceType = value;
                this.displaySelectedTypeContainer(valuesContainers, value)
            })
            this.displaySelectedTypeContainer(valuesContainers, this.field.options.sourceType)
        }

        validateOptions(): boolean {
            let error = false;
            let prevComponent: TextComponent
            const vPC = this.valuesPromptComponents
            vPC.forEach((input, i) => {
                if (vPC.length > 1) {
                    if (i === 0) {
                        prevComponent = vPC[vPC.length - 1]
                    }
                    if (prevComponent.inputEl.value === input.inputEl.value) {
                        setValidationError(
                            input,
                            "Two adjacent values can't be equal"
                        );
                        error = true;
                    }
                    prevComponent = input
                }
                if (/[,]/gu.test(input.inputEl.value) && input.inputEl.parentElement?.lastElementChild) {
                    setValidationError(
                        input,
                        "Values cannot contain a comma"
                    );
                    error = true;
                };
                if (input.inputEl.value == "" && input.inputEl.parentElement?.lastElementChild) {
                    setValidationError(
                        input,
                        "Values can't be null."
                    );
                    error = true;
                };
            });
            return !error
        }

        private createListNotePathContainer(container: HTMLDivElement): HTMLDivElement {
            const valuesListNotePathContainer = container.createDiv({ cls: "field-container" });
            valuesListNotePathContainer.createDiv({ text: `Path of the note`, cls: "label" });
            const input = new TextComponent(valuesListNotePathContainer);
            input.inputEl.addClass("full-width");
            input.inputEl.addClass("with-label");
            new FileSuggest(
                input.inputEl,
                this.plugin,
                "/"
            )
            const listNotePath = this.field.options.valuesListNotePath;
            input.setValue(listNotePath || "");
            input.setPlaceholder("Path/of/the/note.md");
            input.onChange(value => this.field.options.valuesListNotePath = value);
            return valuesListNotePathContainer;
        }

        private createValuesListContainer(parentContainer: HTMLDivElement): HTMLDivElement {
            const presetValuesFields = parentContainer.createDiv()
            const valuesList = presetValuesFields.createDiv();
            const valuesListBody = valuesList.createDiv();
            Object.keys(this.field.options.valuesList).forEach(key => {
                this.valuesPromptComponents.push(this.createValueContainer(valuesListBody, key));
            });
            this.createAddButton(valuesList, valuesListBody)
            return presetValuesFields;
        }

        private createValueContainer(parentNode: HTMLDivElement, key: string): TextComponent {
            const values = this.field.options.valuesList;
            const presetValue = values[key];
            const valueContainer = parentNode.createDiv({ cls: 'field-container', });
            const input = new TextComponent(valueContainer);
            input.inputEl.addClass("full-width");
            input.setValue(presetValue);
            input.onChange(value => {
                this.field.options.valuesList[key] = value;
                removeValidationError(input);
            });
            const valueRemoveButton = new ButtonComponent(valueContainer);
            valueRemoveButton.setIcon("trash")
                .onClick((evt: MouseEvent) => {
                    evt.preventDefault();
                    removeValidationError(input);
                    this.removePresetValue(key);
                    parentNode.removeChild(valueContainer);
                    this.valuesPromptComponents.remove(input);
                });
            if (key != Object.keys(this.field.options)[0]) {
                const valueUpgradeButton = new ButtonComponent(valueContainer);
                setIcon(valueUpgradeButton.buttonEl, "up-chevron-glyph");
                valueUpgradeButton.onClick((evt: MouseEvent) => {
                    const thisValue = values[key];
                    const inputIndex = this.valuesPromptComponents.indexOf(input)
                    const upperComponent = inputIndex !== -1 ? this.valuesPromptComponents[inputIndex - 1] : this.valuesPromptComponents.last();
                    if (upperComponent) {
                        const upperValue = upperComponent.inputEl.value;
                        const upperKey = Object.keys(values).filter(k => values[k] == upperValue)[0];
                        if (upperKey) {
                            upperComponent.setValue(thisValue);
                            values[upperKey] = thisValue;
                            input.setValue(upperValue);
                            values[key] = upperValue;
                        };
                    };
                });
            };
            return input;
        };

        private createValuesFromDVQueryContainer(parentContainer: HTMLDivElement): HTMLDivElement {
            const valuesFromDVQueryTopContainer = parentContainer.createDiv({ cls: "vstacked" })
            valuesFromDVQueryTopContainer.createEl("span", { text: "Dataview function" });
            valuesFromDVQueryTopContainer.createEl("span", { text: "Dataview query returning a list of string (<dv> object is available)", cls: "sub-text" });
            const valuesFromDVQueryContainer = valuesFromDVQueryTopContainer.createDiv({ cls: "field-container" })
            const valuesFromDVQuery = new TextAreaComponent(valuesFromDVQueryContainer);
            valuesFromDVQuery.inputEl.addClass("full-width");
            valuesFromDVQuery.inputEl.cols = 65;
            valuesFromDVQuery.inputEl.rows = 8;
            valuesFromDVQuery.setPlaceholder("ex: dv.pages('#student').map(p => p.name)")
            valuesFromDVQuery.setValue(this.field.options.valuesFromDVQuery || "");
            valuesFromDVQuery.onChange((value) => {
                this.field.options.valuesFromDVQuery = value
            })
            return valuesFromDVQueryTopContainer;
        }

        private displaySelectedTypeContainer(optionContainers: Record<keyof typeof SourceType, HTMLDivElement>, value: keyof typeof SourceType) {
            Object.keys(optionContainers).forEach((key: keyof typeof SourceType) => {
                if (key === value) {
                    optionContainers[key].show()
                } else {
                    optionContainers[key].hide()
                }
            })
        }

        private createAddButton(valuesList: HTMLDivElement, valuesListBody: HTMLDivElement): void {
            const valuesListFooter = valuesList.createDiv();
            const addValue = valuesListFooter.createEl('button');
            addValue.type = 'button';
            addValue.textContent = 'Add a value';
            addValue.onClickEvent(async (evt: MouseEvent) => {
                evt.preventDefault();
                let newKeyNumber = 1;
                Object.keys(this.field.options.valuesList).forEach(key => {
                    if (parseInt(key) && parseInt(key) >= newKeyNumber) {
                        newKeyNumber = parseInt(key) + 1;
                    };
                });
                const newKey = newKeyNumber.toString();
                this.field.options.valuesList[newKey] = "";
                this.valuesPromptComponents.push(this.createValueContainer(valuesListBody, newKey))
            });
            valuesList.createEl("hr");
        }

        private removePresetValue(key: string): void {
            let newValues: Record<string, string> = {};
            for (let _key in this.field.options.valuesList) {
                if (key !== _key) {
                    newValues[_key] = this.field.options.valuesList[_key];
                };
            };
            this.field.options.valuesList = newValues;
        };
    }

}

export interface Modal<T extends Target> extends IBaseValueModal<T> {
    addNewValueToSettings: () => Promise<void>
    inputEl: HTMLInputElement
}

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<Modal<Target>> {
    const base = basicSuggestModal<string, Options>(managedField, plugin)
    return class ValueModal extends base {
        public managedField: IFieldManager<Target, Options>
        public addButton: ButtonComponent;
        public saved: boolean
        constructor(...rest: any[]) {
            super(plugin.app)
            this.managedField = managedField
            this.containerEl.addClass("metadata-menu");
            const inputContainer = this.containerEl.createDiv({ cls: "suggester-input" })
            inputContainer.appendChild(this.inputEl)
            this.containerEl.find(".prompt").prepend(inputContainer)
            cleanActions(this.containerEl, ".footer-actions")
            const footerActionsContainer = this.containerEl.createDiv({ cls: "footer-actions" })
            this.buildAddButton(inputContainer)
            this.buildFooterActions(footerActionsContainer)
        }

        public close(openPreviousModal: boolean = true): void {
            if (openPreviousModal) this.managedField.previousModal?.open()
            super.close()
        }

        getSuggestions(query: string): string[] | Promise<string[]> {
            return getOptionsList(this.managedField).filter(o => o.toLowerCase().includes(query.toLowerCase()))
        }
        renderSuggestion(value: string, el: HTMLElement) {
            el.setText(value)
            el.addClass("value-container")
        }
        onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
            managedField.save(item)
        }

        async onAdd(): Promise<void> {
            throw Error("This class has to implement an onAdd method")
        }

        async addNewValueToSettings(): Promise<void> {
            const newValue = this.inputEl.value;
            const options = this.managedField.options as Options
            switch (options.sourceType) {
                case "ValuesList":
                    let newOptions: string[] | Record<string, string>
                    options.valuesList
                    newOptions = options.valuesList || {}
                    //some legacy options were a flat array
                    if (Array.isArray(newOptions)) {
                        const newValues = [...newOptions, newValue]
                        const newObj: Record<string, string> = {}
                        for (const [k, v] of newValue) { newObj[`${k}`] = v }
                    } else if (typeof newOptions === "object") {
                        newOptions[`${Object.keys(newOptions).length + 1}`] = newValue
                    }
                    this.managedField.options.valuesList = newOptions
                    break;
                case "ValuesListNotePath":
                    const valuesFile = plugin.app.vault.getAbstractFileByPath((options as Options).valuesListNotePath);
                    if (valuesFile instanceof TFile && valuesFile.extension == "md") {
                        const result = await plugin.app.vault.read(valuesFile)
                        plugin.app.vault.modify(valuesFile, `${result}\n${newValue}`);
                    }
                default:
                    break;
            }
        }

        buildAddButton(container: HTMLDivElement) {
            // addButton
            this.addButton = new ButtonComponent(container)
            this.addButton.setIcon("plus")
            this.addButton.onClick(async () => await this.onAdd())
            this.addButton.setCta();
            this.addButton.setTooltip("Add this value to this field settings")
            this.addButton.buttonEl.hide();
        }

        buildFooterActions(footerActionsContainer: HTMLDivElement) {
            footerActionsContainer.createDiv({ cls: "spacer" })
            //confirm button
            this.buildConfirm(footerActionsContainer)
            //cancel button
            const cancelButton = new ButtonComponent(footerActionsContainer)
            cancelButton.setIcon("cross")
            cancelButton.onClick(() => this.close())
            cancelButton.setTooltip("Cancel")
            //clear value button
            const clearButton = new ButtonComponent(footerActionsContainer)
            clearButton.setIcon("eraser")
            clearButton.setTooltip("Clear field's value(s)")
            clearButton.onClick(async () => {
                await this.clearValues();
                this.close();
            })
            clearButton.buttonEl.addClass("danger")
            this.modalEl.appendChild(footerActionsContainer)

        }

        buildConfirm(footerActionsContainer: HTMLDivElement) { }

        async clearValues() {
            this.managedField.save("")
        }
    }
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked: () => any) {
    if (Array.isArray(managedField.value)) {
        container.createDiv({ text: `<P> ${managedField.value.join(", ")}` })
    } else {
        return baseDisplayValue(managedField, container, onClicked)
    }
}

export function actions(plugin: MetadataMenu, field: LegacyField, file: TFile, location: ActionLocation, indexedPath: string | undefined): void {
    const iconName = getIcon(mapFieldType(field.type));
    const action = async () => {
        const eF = await getExistingFieldForIndexedPath(plugin, file, indexedPath)
        fieldValueManager(plugin, field.id, field.fileClassName, file, eF, indexedPath)?.openModal()
    };
    if (isSuggest(location)) {
        location.options.push({
            id: `update_${field.name}`,
            actionLabel: `<span>Update <b>${field.name}</b></span>`,
            action: action,
            icon: iconName
        });
    } else if (isFieldActions(location)) {
        location.addOption(iconName, action, `Update ${field.name}'s value`);
    }
}

export function getOptionsStr(managedField: IFieldManager<Target, Options>): string {
    return managedField.options.template || ""
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    console.error("Not implemented")
    return false
}

//#region utils
export function getOptionsList(managedField: IFieldManager<Target, Options>): string[] {
    const options = managedField.options
    let values: string[] = [];
    if (Array.isArray(options)) {
        values = options;
    } else if (!options.sourceType) {
        values = Object.values(options);
    } else {
        switch (options.sourceType) {
            case "ValuesList":
                values = Object.values(options.valuesList || {});
                break;
            case "ValuesListNotePath":
                values = managedField.plugin.fieldIndex.valuesListNotePathValues
                    .get(managedField.options.valuesListNotePath) || [];
                break;
            case "ValuesFromDVQuery":
                {
                    const dvApi = managedField.plugin.app.plugins.plugins.dataview?.api
                    if (dvApi) {
                        //TODO validate this is still working after adding fallback empty object
                        //values = new Function("dv", "current", `return ${this.field.options.valuesFromDVQuery}`)(dvApi, dvFile)
                        const dvFile = isSingleTargeted(managedField) ? dvApi.page(managedField.target.path) : {}
                        values = new Function("dv", "current", `return ${managedField.options.valuesFromDVQuery}`)(dvApi, dvFile || {})
                    } else {
                        values = []
                    }
                }
                break;
            default:
                values = [];
                break;
        }
    }
    return values;
}
//#endregion