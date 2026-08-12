import { Controller, type OnInit } from "@flamework/core";
@Controller()
export class CmdrController implements OnInit {
	public onInit(): void {
		this.register();
	}

	private register(): void {}
}
