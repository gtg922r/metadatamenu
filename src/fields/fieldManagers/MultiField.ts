import MetadataMenu from "main";
import { Menu, setIcon, TextComponent, TFile } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import MultiSelectModal from "src/modals/fields/MultiSelectModal";
import { FieldType } from "src/types/fieldTypes";
import Field from "../_Field";
import AbstractListBasedField from "../abstractFieldManagers/AbstractListBasedField";
import { FieldOptions } from "src/components/FieldsModal";
import { ExistingField } from "../ExistingField";
import ObjectModal from "src/modals/fields/ObjectModal";
import ObjectListModal from "src/modals/fields/ObjectListModal";
import { Note } from "src/note/note";
import { fieldValueManager } from "../Field";
import { getActions } from "../Fields";

export default class MultiField extends AbstractListBasedField {

    valuesPromptComponents: Array<TextComponent> = [];

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Multi)
    }

    public async buildAndOpenModal(file: TFile, indexedPath?: string): Promise<void> {
        const eF = await Note.getExistingFieldForIndexedPath(this.plugin, file, indexedPath)
        fieldValueManager(this.plugin, this.field.id, this.field.fileClassName, file, eF, indexedPath)?.openModal()
    }

    public addFieldOption(file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions, indexedPath?: string): void {
        return getActions("Select")(this.plugin, this.field, file, location, indexedPath)
        // const name = this.field.name
        // const action = async () => await this.buildAndOpenModal(file, indexedPath)
        // if (MultiField.isSuggest(location)) {
        //     location.options.push({
        //         id: `update_${name}`,
        //         actionLabel: `<span>Update <b>${name}</b></span>`,
        //         action: action,
        //         icon: FieldIcon[FieldType.Multi]
        //     });
        // } else if (MultiField.isFieldOptions(location)) {
        //     location.addOption(FieldIcon[FieldType.Multi], action, `Update ${name}'s value`);
        // };
    };

    public createAndOpenFieldModal(
        file: TFile,
        selectedFieldName: string,
        eF?: ExistingField,
        indexedPath?: string,
        lineNumber?: number,
        asList?: boolean,
        asBlockquote?: boolean,
        previousModal?: ObjectModal | ObjectListModal,
        preSelectedOptions?: Array<string>
    ): void {
        const fieldModal = new MultiSelectModal(this.plugin, file, this.field, eF, indexedPath, lineNumber, asList, asBlockquote, previousModal, preSelectedOptions);
        fieldModal.titleEl.setText(`Select options for ${selectedFieldName}`);
        fieldModal.open();
    }

    public createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
    ): void {

        // let valueHovered = false;
        // let currentValues: string[] = [];
        // if (p[this.field.name]) {
        //     if (Object.keys(p[this.field.name]).includes("path")) {
        //         currentValues = [`[[${p[this.field.name].path.replace(".md", "")}]]`]
        //     } else if (Array.isArray(p[this.field.name])) {
        //         p[this.field.name].forEach((item: any) => {
        //             if (Object.keys(item).includes("path")) {
        //                 currentValues.push(`[[${item.path.replace(".md", "")}]]`)
        //             } else {
        //                 currentValues.push(item.trim())
        //             }
        //         })
        //     } else {
        //         const value = p[this.field.name]
        //         currentValues = value ? `${value}`.split(",").map((v: string) => v.trim()) : [];
        //     }
        // }

        // const file = this.plugin.app.vault.getAbstractFileByPath(p["file"]["path"])


        // /* current values container */
        // const valuesContainer = fieldContainer.createDiv({ cls: "values-container" })

        // /* current values */
        // currentValues.forEach(v => {
        //     const valueContainer = valuesContainer.createDiv({ cls: "item-container" });
        //     const valueRemoveBtn = valueContainer.createEl("button");
        //     const valueLabel = valueContainer.createDiv({ cls: "label", text: v })
        //     setIcon(valueRemoveBtn, "cross")
        //     valueRemoveBtn.hide();
        //     valueRemoveBtn.onclick = async () => {
        //         const remainingValues = currentValues.filter(cV => cV !== v).join(", ")
        //         MultiField.replaceValues(this.plugin, p.file.path, this.field.id, remainingValues);
        //     }

        //     valueContainer.onmouseover = () => {
        //         valueHovered = true;
        //         doubleSpacer.hide();
        //         singleSpacer.hide();
        //         valueRemoveBtn.show();
        //         valueLabel.addClass("hovered");
        //     }
        //     valueContainer.onmouseout = () => {
        //         valueHovered = false;
        //         valueRemoveBtn.hide();
        //         singleSpacer.show();
        //         doubleSpacer.hide();
        //         valueLabel.removeClass("hovered");
        //     }

        // })

        // /* button to display input */
        // const addBtn = valuesContainer.createEl("button");
        // setIcon(addBtn, "list-plus");
        // let fieldModal: MultiSelectModal;
        // if (file instanceof TFile && file.extension == "md") {
        //     addBtn.onclick = async () => await this.buildAndOpenModal(file);
        // } else {
        //     addBtn.onclick = () => { };
        // }

        // /* end spacer */
        // const singleSpacer = valuesContainer.createDiv({ cls: "spacer-1" });
        // const doubleSpacer = valuesContainer.createDiv({ cls: "spacer-2" });

        // if (!attrs?.options?.alwaysOn) {
        //     addBtn.hide();
        //     fieldContainer.onmouseover = () => {
        //         addBtn.show();
        //         doubleSpacer.hide();
        //         if (!valueHovered) singleSpacer.show();
        //     }
        //     fieldContainer.onmouseout = () => {
        //         addBtn.hide();
        //         singleSpacer.hide();
        //         doubleSpacer.show();
        //     }
        // }

        // /* initial state */
        // if (!attrs?.options?.alwaysOn) {
        //     singleSpacer.hide();
        //     doubleSpacer.show();
        //     addBtn.hide();
        // } else {
        //     singleSpacer.show();
        //     doubleSpacer.hide();
        //     addBtn.show();
        // }
    }
}
